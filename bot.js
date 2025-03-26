const { Client, GatewayIntentBits, Collection, REST, Routes, ButtonInteraction, AttachmentBuilder, EmbedBuilder, ButtonStyle,
    ActionRowBuilder, ButtonBuilder
} = require('discord.js');
const { CronJob } = require('cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REGISTERED_USERS_FILE = path.join(__dirname, 'registered_users.csv');
const SENT_QUESTIONS_FILE = path.join(__dirname, 'sent_questions.csv');
const MESSAGE_HISTORY_FILE = path.join(__dirname, 'message_history.csv');
const CHAO_VOTES_FILE = path.join(__dirname, 'chao.csv');

const SLOVENIA_TIMEZONE = 'Europe/Ljubljana';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });
client.commands = new Collection();

const readChaoVotes = () => {
    if (!fs.existsSync(CHAO_VOTES_FILE)) {
        fs.writeFileSync(CHAO_VOTES_FILE, 'userId,chaoType,voteDate\n');
        return [];
    }

    const lines = fs.readFileSync(CHAO_VOTES_FILE, 'utf8').split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const record = {};

        headers.forEach((header, index) => {
            record[header] = values[index];
        });

        return record;
    });
};

const saveChaoVote = (userId, chaoType) => {
    const votes = readChaoVotes();
    const today = new Date().toISOString().slice(0, 10);

    // Check if user already voted
    if (votes.some(vote => vote.userId === userId)) {
        return false; // User already voted
    }

    // Add new vote
    votes.push({
        userId: userId,
        chaoType: chaoType,
        voteDate: today
    });

    // Convert to CSV and save
    const headers = ['userId', 'chaoType', 'voteDate'];
    const csvLines = [
        headers.join(','),
        ...votes.map(vote => {
            return headers.map(header => vote[header]).join(',');
        })
    ];

    fs.writeFileSync(CHAO_VOTES_FILE, csvLines.join('\n'));
    return true; // Vote saved successfully
};

const hasVotedForChao = (userId) => {
    const votes = readChaoVotes();
    return votes.some(vote => vote.userId === userId);
};

const getChaoStats = () => {
    const votes = readChaoVotes();

    // Count votes for each type
    const heroVotes = votes.filter(vote => vote.chaoType === 'hero').length;
    const darkVotes = votes.filter(vote => vote.chaoType === 'dark').length;
    const totalVotes = heroVotes + darkVotes;

    // Calculate percentages
    const heroPercentage = totalVotes > 0 ? Math.round((heroVotes / totalVotes) * 100) : 0;
    const darkPercentage = totalVotes > 0 ? Math.round((darkVotes / totalVotes) * 100) : 0;

    return {
        heroVotes,
        darkVotes,
        totalVotes,
        heroPercentage,
        darkPercentage
    };
};

const generateChaoVisual = (stats) => {
    // Round percentages to nearest 10%
    const heroTens = Math.round(stats.heroPercentage / 10);
    const darkTens = Math.round(stats.darkPercentage / 10);

    // Generate emoji squares
    const heroSquares = '🟦'.repeat(heroTens);
    const darkSquares = '🟥'.repeat(darkTens);

    return `Hero Chao: ${heroSquares} ${stats.heroPercentage}% (${stats.heroVotes} votes)\n` +
        `Dark Chao: ${darkSquares} ${stats.darkPercentage}% (${stats.darkVotes} votes)\n` +
        `Total Votes: ${stats.totalVotes}`;
};

const showChaoChoice = async (user) => {
    if (hasVotedForChao(user.id)) {
        return; // User already voted
    }

    // Create embed for Chao choice
    const embed = new EmbedBuilder()
        .setTitle('🥚 Choose Your Chao! 🥚')
        .setDescription('Congratulations on your first correct answer! Which Chao do you prefer?')
        .setColor('#1E90FF')
        .addFields(
            { name: 'Hero Chao', value: 'Kind and friendly. Loves positive actions.', inline: true },
            { name: 'Dark Chao', value: 'Mischievous and bold. Thrives on chaos.', inline: true }
        )
        .setImage('https://cdn.discordapp.com/attachments/677053170676924447/1352444976906109018/chao.png?ex=67de0a09&is=67dcb889&hm=9007d026867861f92fdb49e2337f64b145da064d266a095cd510f3a2092084cb&');

    // Create buttons for choice
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('chao_hero')
            .setLabel('Hero Chao')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('chao_dark')
            .setLabel('Dark Chao')
            .setStyle(ButtonStyle.Danger)
    );

    // Send choice message
    try {
        await user.send({ embeds: [embed], components: [buttons] });
    } catch (error) {
        console.error(`Failed to send Chao choice to ${user.id}:`, error);
    }
};

const readMessageHistory = () => {
    if (!fs.existsSync(MESSAGE_HISTORY_FILE)) {
        fs.writeFileSync(MESSAGE_HISTORY_FILE, 'userId,messageId,questionIndex,sentDate,answered\n');
        return [];
    }

    const lines = fs.readFileSync(MESSAGE_HISTORY_FILE, 'utf8').split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const record = {};

        headers.forEach((header, index) => {
            if (header === 'answered') {
                record[header] = values[index] === 'true';
            } else if (header === 'questionIndex') {
                record[header] = parseInt(values[index] || '0');
            } else {
                record[header] = values[index];
            }
        });

        return record;
    });
};

const saveMessageHistory = (history) => {
    const headers = ['userId', 'messageId', 'questionIndex', 'sentDate', 'answered'];
    const csvLines = [
        headers.join(','),
        ...history.map(record => {
            return headers.map(header => record[header]).join(',');
        })
    ];

    fs.writeFileSync(MESSAGE_HISTORY_FILE, csvLines.join('\n'));
};

const readSentQuestions = () => {
    if (!fs.existsSync(SENT_QUESTIONS_FILE)) {
        fs.writeFileSync(SENT_QUESTIONS_FILE, 'questionIndex,sentDate\n');
        return [];
    }

    const lines = fs.readFileSync(SENT_QUESTIONS_FILE, 'utf8').split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const record = {};

        headers.forEach((header, index) => {
            if (header === 'questionIndex') {
                record[header] = parseInt(values[index] || '0');
            } else {
                record[header] = values[index];
            }
        });

        return record;
    });
};

const saveSentQuestion = (questionIndex) => {
    const sentQuestions = readSentQuestions();
    const today = new Date().toISOString().slice(0, 10);

    sentQuestions.push({
        questionIndex: questionIndex,
        sentDate: today
    });

    const headers = ['questionIndex', 'sentDate'];
    const csvLines = [
        headers.join(','),
        ...sentQuestions.map(record => {
            return headers.map(header => record[header]).join(',');
        })
    ];

    fs.writeFileSync(SENT_QUESTIONS_FILE, csvLines.join('\n'));
};

const getNextQuestion = () => {
    // Get all sent question indices
    const sentQuestions = readSentQuestions();
    const sentIndices = sentQuestions.map(q => q.questionIndex);

    // If we've sent all questions, reset and use them all again
    if (sentIndices.length >= triviaQuestionsSonic.length) {
        // Clear sent questions file
        fs.writeFileSync(SENT_QUESTIONS_FILE, 'questionIndex,sentDate\n');
        return {
            questionData: triviaQuestionsSonic[Math.floor(Math.random() * triviaQuestionsSonic.length)],
            questionIndex: Math.floor(Math.random() * triviaQuestionsSonic.length)
        };
    }

    // Find questions that haven't been sent yet
    const availableIndices = Array.from(
        { length: triviaQuestionsSonic.length },
        (_, i) => i
    ).filter(i => !sentIndices.includes(i));

    // Choose a random question from available ones
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const questionIndex = availableIndices[randomIndex];

    return {
        questionData: triviaQuestionsSonic[questionIndex],
        questionIndex: questionIndex
    };
};

// Modified function to delete previous unanswered messages
const deleteUnansweredMessages = async (userId) => {
    try {
        const messageHistory = readMessageHistory();
        const userHistory = messageHistory.filter(record =>
            record.userId === userId &&
            !record.answered
        );

        if (userHistory.length === 0) return;

        // Fetch the user
        const user = await client.users.fetch(userId);
        const channel = await user.createDM();

        // Track which messages were successfully deleted or failed
        const processedRecords = [];

        // Delete each unanswered message
        for (const record of userHistory) {
            try {
                const message = await channel.messages.fetch(record.messageId);
                await message.delete();
                // Mark this record for removal
                processedRecords.push(record);
            } catch (error) {
                if (error.code === 10008) { // Unknown Message error code
                    processedRecords.push(record);
                } else {
                    console.error(`Failed to delete message for ${userId}: ${error}`);
                }
            }
        }

        // Remove all processed records (whether deleted or failed with Unknown Message)
        const updatedHistory = messageHistory.filter(record =>
            !processedRecords.some(p => p.messageId === record.messageId)
        );

        saveMessageHistory(updatedHistory);
    } catch (error) {
        console.error(`Error deleting unanswered messages for ${userId}: ${error}`);
    }
};

const triviaQuestionsSonic = require('./sonic_quiz.js');

const getTriviaEmbed = (questionData) => {
    if (!questionData.spoiler) {
        return new EmbedBuilder()
            .setTitle("League of Legends Trivia!")
            .setDescription(questionData.question)
            .setColor(questionData.color)
            .setImage(questionData.image);
    }
    else{
        return new EmbedBuilder()
            .setTitle("League of Legends Trivia!")
            .setDescription(questionData.question)
            .setColor("NotQuiteBlack")
            .setImage("https://cdn.discordapp.com/attachments/677053170676924447/1354389233284026481/lol-mia-league-of-legends.gif?ex=67e51cc4&is=67e3cb44&hm=a5a5075f76bb36ead3c975efc1f5929f82f1d96bddc2705fcc13b5ac7eda7ef9&");
    }
};

const getTriviaButtons = (questionData) => {
    const shuffledOptions = [...questionData.options].sort(() => Math.random() - 0.5);
    return new ActionRowBuilder().addComponents(
        shuffledOptions.map((option, index) =>
            new ButtonBuilder()
                .setCustomId(`trivia_${index}`)
                .setLabel(option)
                .setStyle(ButtonStyle.Primary)
        )
    );
};

const readCSV = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim());
};

const writeCSV = (filePath, data) => {
    fs.writeFileSync(filePath, data.join('\n'));
};

const registerUser = async (interaction) => {
    const userId = interaction.user.id;
    const registeredUsers = readCSV(REGISTERED_USERS_FILE);

    if (registeredUsers.includes(userId)) {
        return interaction.reply({ content: "✅ You are already registered!", ephemeral: true });
    }

    registeredUsers.push(userId);
    writeCSV(REGISTERED_USERS_FILE, registeredUsers);

    return interaction.reply({ content: "🎉 You are now registered for daily League of Legends trivia!", ephemeral: true }).then(sendDailyQuizToUser(interaction.user.id));
};

const unregisterUser = async (interaction) => {
    const userId = interaction.user.id;
    const registeredUsers = readCSV(REGISTERED_USERS_FILE);

    if (!registeredUsers.includes(userId)) {
        return interaction.reply({ content: "❌ You are not registered for daily trivia.", ephemeral: true });
    }

    const updatedUsers = registeredUsers.filter(id => id !== userId);
    writeCSV(REGISTERED_USERS_FILE, updatedUsers);

    // Delete all the bot's messages involving this user in the current channel


    return interaction.reply({ content: "👋 You have been unregistered from daily League of Legends trivia.", ephemeral: true });
};


let globalQuestionData = null;
let globalQuestionIndex = null;

const sendDailyQuizToUser = async (userId) => {
    const messageHistory = readMessageHistory();
    const today = new Date().toISOString().slice(0, 10);

    const questionData = globalQuestionData;
    const user = await client.users.fetch(userId);
    const embed = getTriviaEmbed(questionData);
    const buttons = getTriviaButtons(questionData);

    const message = await user.send({ embeds: [embed], components: [buttons] });

    messageHistory.push({
        userId: userId,
        messageId: message.id,
        questionIndex: globalQuestionIndex,
        sentDate: today,
        answered: false
    });
    saveMessageHistory(messageHistory);
}

const sendDailyQuiz = async () => {
    const registeredUsers = readCSV(REGISTERED_USERS_FILE);

    // Get a question that hasn't been sent yet
    const { questionData, questionIndex } = getNextQuestion();
    globalQuestionData = questionData;
    globalQuestionIndex = questionIndex;

    console.log("Today's question index", globalQuestionIndex);

    // Track this question as sent
    saveSentQuestion(questionIndex);

    // Keep track of message history
    const messageHistory = readMessageHistory();
    const today = new Date().toISOString().slice(0, 10);

    for (const userId of registeredUsers) {
        try {
            // Delete any unanswered previous messages for this user
            await deleteUnansweredMessages(userId);

            const user = await client.users.fetch(userId);
            const embed = getTriviaEmbed(questionData);
            const buttons = getTriviaButtons(questionData);

            // Send new question
            const message = await user.send({ embeds: [embed], components: [buttons] });

            // Record this message in history
            messageHistory.push({
                userId: userId,
                messageId: message.id,
                questionIndex: questionIndex,
                sentDate: today,
                answered: false
            });

        } catch (error) {
            console.error(`❌ Failed to send quiz to ${userId}:`, error);
        }
    }

    // Save updated message history
    saveMessageHistory(messageHistory);
};

// Define the profile command
const profile = async (interaction) => {
    const userId = interaction.user.id;
    const user = interaction.user;

    // Check if user is registered
    const registeredUsers = readCSV(REGISTERED_USERS_FILE);
    if (!registeredUsers.includes(userId)) {
        return interaction.reply({
            content: "❌ You need to register for Sonic Trivia first! Use `/register` to join.",
            ephemeral: true
        });
    }

    // Get user profile data
    const profileData = getUserProfileData(userId);

    // Get global ranking
    const ranking = getGlobalRanking(userId);

    // Generate fun fact based on streak
    const funFact = generateFunFact(profileData.currentStreak);

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle(`${user.displayName}'s League of Legends Trivia Profile`)
        .setColor('#1E90FF')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '📊 Score', value: `${profileData.currentScore} points`, inline: true },
            { name: '🏆 Global Rank', value: `#${ranking}`, inline: true },
            { name: '🔥 Current Streak', value: `${profileData.currentStreak} days`, inline: true },
            { name: '⭐ Best Streak', value: `${profileData.biggestStreak} days`, inline: true },
            { name: '📅 Registered', value: `<t:${Math.floor(profileData.registrationDate / 1000)}:R>`, inline: true },
            { name: '✓ Completion Rate', value: `${calculateCompletionRate(profileData)}%`, inline: true },
            { name: '👑 Fun Fact', value: funFact }
        )
        .setFooter({ text: 'Keep answering daily trivia to improve your stats!' })
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
};

// Function to get user profile data
const getUserProfileData = (userId) => {
    const profiles = readProfilesCSV();
    let profile = profiles.find(p => p.userId === userId);

    if (!profile) {
        // Create new profile if not found
        profile = {
            userId: userId,
            currentScore: 0,
            biggestStreak: 0,
            currentStreak: 0,
            registrationDate: Date.now(),
            completedDates: [],
            failedDates: []
        };

        // Save new profile
        saveProfileData(profile);
    }

    return profile;
};

// Read profiles CSV
const readProfilesCSV = () => {
    const PROFILES_FILE = path.join(__dirname, 'user_profiles.csv');
    if (!fs.existsSync(PROFILES_FILE)) {
        fs.writeFileSync(PROFILES_FILE, 'userId,currentScore,biggestStreak,currentStreak,registrationDate,completedDates,failedDates,visibility');
        return [];
    }

    const lines = fs.readFileSync(PROFILES_FILE, 'utf8').split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const profile = {};

        headers.forEach((header, index) => {
            if (header === 'completedDates' || header === 'failedDates') {
                profile[header] = values[index] ? values[index].split(';') : [];
            } else if (header === 'currentScore' || header === 'biggestStreak' || header === 'currentStreak') {
                profile[header] = parseInt(values[index] || '0');
            } else if (header === 'registrationDate') {
                profile[header] = parseInt(values[index] || Date.now());
            }
            else if (header === 'visibility') {
                    profile[header] = values[index] === 'true';
            } else {
                profile[header] = values[index];
            }
        });

        if (profile.visibility === undefined) {
            profile.visibility = true;
        }

        return profile;
    });
};

// Save profile data
const saveProfileData = (profileData) => {
    const PROFILES_FILE = path.join(__dirname, 'user_profiles.csv');
    const profiles = readProfilesCSV();

    // Update or add profile
    const existingIndex = profiles.findIndex(p => p.userId === profileData.userId);
    if (existingIndex >= 0) {
        profiles[existingIndex] = profileData;
    } else {
        profiles.push(profileData);
    }

    // Convert to CSV format
    const headers = ['userId', 'currentScore', 'biggestStreak', 'currentStreak', 'registrationDate', 'completedDates', 'failedDates', 'visibility'];
    const csvLines = [
        headers.join(','),
        ...profiles.map(profile => {
            return headers.map(header => {
                if (header === 'completedDates' || header === 'failedDates') {
                    return profile[header].join(';');
                } else {
                    return profile[header];
                }
            }).join(',');
        })
    ];

    fs.writeFileSync(PROFILES_FILE, csvLines.join('\n'));
};

const toggleVisibility = async (interaction) => {
    const userId = interaction.user.id;

    // Check if user is registered
    const registeredUsers = readCSV(REGISTERED_USERS_FILE);
    if (!registeredUsers.includes(userId)) {
        return interaction.reply({
            content: "❌ You need to register for League of Legends Trivia first! Use `/register` to join.",
            ephemeral: true
        });
    }

    // Get and update user profile
    const profileData = getUserProfileData(userId);
    profileData.visibility = !profileData.visibility;
    saveProfileData(profileData);

    return interaction.reply({
        content: `🔒 Your profile is now ${profileData.visibility ? 'visible' : 'hidden'} on the scoreboard.`,
        ephemeral: true
    });
};

const dailyScoreboard = async (interaction) => {
    const profiles = readProfilesCSV();

    // Sort profiles by score (descending)
    const sortedProfiles = [...profiles].sort((a, b) => b.currentScore - a.currentScore);

    // Take top 10 (or fewer if there aren't that many)
    const topPlayers = sortedProfiles.slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('🏆 League of Legends Trivia Leaderboard 🏆')
        .setColor('#FFD700')
        .setDescription('The top trivia masters of League of Legends knowledge!')
        .setTimestamp();

    let leaderboardText = '';

    if (topPlayers.length === 0) {
        leaderboardText = 'No players yet. Be the first to register with `/register`!\n\n';
    } else {
        for (let i = 0; i < topPlayers.length; i++) {
            try {
                const userProfile = topPlayers[i];
                let playerDisplayName;

                // Fetch user to get display name
                try {
                    const user = await client.users.fetch(userProfile.userId);
                    playerDisplayName = userProfile.visibility ? user.displayName : '||Hidden||';
                } catch (error) {
                    playerDisplayName = userProfile.visibility ? 'Unknown User' : '||Hidden||';
                }

                // Medals for top 3
                let rank;
                if (i === 0) rank = '🥇';
                else if (i === 1) rank = '🥈';
                else if (i === 2) rank = '🥉';
                else rank = `${i + 1}.`;

                leaderboardText += `${rank} **${playerDisplayName}** - ${userProfile.currentScore} pts `;
                leaderboardText += `(streak: ${userProfile.currentStreak})\n`;
            } catch (error) {
                console.error(`Failed to process user ${topPlayers[i].userId}:`, error);
            }
        }
    }
    embed.setDescription(leaderboardText);
    embed.setFooter({
        text: `Total players: ${profiles.length} | Update your visibility with /privacy`
    });

    await interaction.user.send({embeds: [embed]});
}

// Updated scoreboard command that always displays user info for testing
const scoreboard = async (interaction) => {
    const userId = interaction.user.id;
    const displayName = interaction.user.displayName;

    // Get all profiles
    const profiles = readProfilesCSV();

    // Sort profiles by score (descending)
    const sortedProfiles = [...profiles].sort((a, b) => b.currentScore - a.currentScore);

    // Take top 10 (or fewer if there aren't that many)
    const topPlayers = sortedProfiles.slice(0, 10);

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle('🏆 League of Legends Trivia Leaderboard 🏆')
        .setColor('#FFD700')
        .setDescription('The top trivia masters of League of Legends knowledge!')
        .setTimestamp();

    // Get actual usernames and add to embed
    let leaderboardText = '';

    if (topPlayers.length === 0) {
        leaderboardText = 'No players yet. Be the first to register with `/register`!\n\n';
    } else {
        for (let i = 0; i < topPlayers.length; i++) {
            try {
                const userProfile = topPlayers[i];
                let playerDisplayName;

                // Fetch user to get display name
                try {
                    const user = await client.users.fetch(userProfile.userId);
                    playerDisplayName = userProfile.visibility ? user.displayName : '||Hidden||';
                } catch (error) {
                    playerDisplayName = userProfile.visibility ? 'Unknown User' : '||Hidden||';
                }

                // Medals for top 3
                let rank;
                if (i === 0) rank = '🥇';
                else if (i === 1) rank = '🥈';
                else if (i === 2) rank = '🥉';
                else rank = `${i + 1}.`;

                // Highlight the user who requested the scoreboard
                const isCurrentUser = userProfile.userId === userId;
                if (isCurrentUser) {
                    leaderboardText += `**${rank} ${playerDisplayName} - ${userProfile.currentScore} pts `;
                    leaderboardText += `(streak: ${userProfile.currentStreak}) ← YOU**\n`;
                } else {
                    leaderboardText += `${rank} **${playerDisplayName}** - ${userProfile.currentScore} pts `;
                    leaderboardText += `(streak: ${userProfile.currentStreak})\n`;
                }
            } catch (error) {
                console.error(`Failed to process user ${topPlayers[i].userId}:`, error);
            }
        }
    }

    embed.setDescription(leaderboardText);

    // Find the user's rank
    const userRank = sortedProfiles.findIndex(profile => profile.userId === userId) + 1;
    const userProfile = sortedProfiles[userRank - 1];

    // Always show user info section for testing
    embed.addFields({
        name: '🦔 Your Information',
        value:
            `Rank: ${userRank > 0 ? `#${userRank} - ${userProfile.currentScore} pts` : 'Not ranked'}\n` +
            `Visibility: ${userRank > 0 ? (userProfile.visibility ? 'Visible' : 'Hidden') : 'N/A'}`,
        inline: false
    });

    // Add additional section showing user rank if they're not in top 10 but are registered
    if (userRank > 0 && userRank > topPlayers.length) {
        embed.addFields({
            name: '📊 Your Ranking',
            value: `You are ranked #${userRank} with ${userProfile.currentScore} points and a streak of ${userProfile.currentStreak}.`,
            inline: false
        });
    }

    // Add footer with total players count
    embed.setFooter({
        text: `Total players: ${profiles.length} | Update your visibility with /privacy`
    });

    return interaction.reply({ embeds: [embed] });
};
const privacy = async (interaction) => {
    return toggleVisibility(interaction);
};

// Get global ranking
const getGlobalRanking = (userId) => {
    const profiles = readProfilesCSV();

    // Sort profiles by score (descending)
    const sortedProfiles = [...profiles].sort((a, b) => b.currentScore - a.currentScore);

    // Find user's rank
    const rank = sortedProfiles.findIndex(p => p.userId === userId) + 1;
    return rank || profiles.length;
};

// Calculate completion rate
const calculateCompletionRate = (profileData) => {
    const total = profileData.completedDates.length + profileData.failedDates.length;
    if (total === 0) return 0;

    return Math.round((profileData.completedDates.length / total) * 100);
};

// Generate fun fact based on streak
const generateFunFact = (streak) => {
    const facts = [
        `If you had ${streak} stacks of Mejai’s Soulstealer, you'd be ${streak === 0 ? "getting hard-flamed in chat!" : "absolutely smurfing!"}`,
        `Your streak of ${streak} is ${streak > 10 ? "more legendary than" : "working towards"} Faker’s highlight plays!`,
        `With ${streak} correct answers, you've collected ${streak} champion mastery points! ${streak >= 7 ? "You’re on your way to Challenger!" : `Only ${7 - streak} more for a respectable rank!`}`,
        `If Baron Nashor had ${streak} buffs, your team would be unstoppable!`,
        `Your ${streak} day streak is ${streak > 5 ? "more consistent than" : "not quite as good as"} Uzi’s CS per minute!`,
        `${streak} days? Teemo has placed more shrooms in a single game! Step it up!`
    ];

    const mockingFacts = [
        `🐸 A ${streak}-day streak? Even Yuumi mains put in more effort than that!`,
        `🐸 With just ${streak} days, you're making Bronze IV promos look easy!`,
        `🐸 ${streak} days? That’s lower than your average turret gold bounty!`,
        `🐸 Only ${streak} days? Even AFK players have a longer game time!`,
        `🐸 With a streak of ${streak}, you're barely keeping up with a 0/10 Yasuo!`,
        `🐸 Even an inting Singed lasts longer in lane than your ${streak}-day streak!`,
        `🐸 Your streak is at ${streak}? Even Tyler1’s bans last longer than that!`,
    ];

    // Return random fact
    if (streak <= 2 && Math.floor(Math.random() * 10) === 6) {
        return mockingFacts[Math.floor(Math.random() * mockingFacts.length)];
    }
    return facts[Math.floor(Math.random() * facts.length)];
};


// Update the updateUserScore function to update profile data
const updateUserScore = (userId, isCorrect = true) => {
    // Get profile data
    const profileData = getUserProfileData(userId);
    const today = new Date().toISOString().slice(0, 10);

    if (isCorrect) {
        // Update score
        profileData.currentScore++;

        // Update streak
        profileData.currentStreak++;
        if (profileData.currentStreak > profileData.biggestStreak) {
            profileData.biggestStreak = profileData.currentStreak;
        }

        // Add to completed dates
        if (!profileData.completedDates.includes(today)) {
            profileData.completedDates.push(today);
        }
    } else {
        // Reset streak on wrong answer
        profileData.currentStreak = 0;

        // Add to failed dates
        if (!profileData.failedDates.includes(today)) {
            profileData.failedDates.push(today);
        }
    }

    // Save profile data
    saveProfileData(profileData);
};

// Modify handleButtonInteraction to update score based on answer correctness
const handleButtonInteraction = async (interaction) => {
    console.log(interaction);
    if (interaction.customId.startsWith("register_button")) {
        await registerUser(interaction);
    }
    if (interaction.customId.startsWith("chao_")) {
        const chaoType = interaction.customId.split('_')[1]; // hero or dark
        const saved = saveChaoVote(interaction.user.id, chaoType);

        if (!saved) {
            return interaction.reply({ content: "You've already voted for your favorite Chao!", ephemeral: true });
        }

        // Get stats after saving the vote
        const stats = getChaoStats();
        const visual = generateChaoVisual(stats);

        // Create result embed
        const embed = new EmbedBuilder()
            .setTitle(`You chose the ${chaoType === 'hero' ? 'Hero' : 'Dark'} Chao!`)
            .setDescription(`Thanks for your vote! Here are the current results:\n\n${visual}`)
            .setColor(chaoType === 'hero' ? '#3498DB' : '#E74C3C')
            .setImage('https://cdn.discordapp.com/attachments/677053170676924447/1352444976906109018/chao.png?ex=67de0a09&is=67dcb889&hm=9007d026867861f92fdb49e2337f64b145da064d266a095cd510f3a2092084cb&');;

        return interaction.update({ embeds: [embed], components: [] });
    }

    if (interaction.customId.startsWith("trivia_")) {
        const questionData = globalQuestionData;
        if (!questionData) {
            await interaction.reply({ content: "⚠️ No active trivia question found.", ephemeral: true });
            return;
        }

        const selectedAnswer = interaction.component.label;
        const isCorrect = selectedAnswer === questionData.answer;

        // Update user score
        updateUserScore(interaction.user.id, isCorrect);

        const embed = getTriviaEmbed(questionData)
            .setDescription(`**${questionData.question}**\n\nYour Answer: ${selectedAnswer}\n\n${isCorrect ? "✅ Correct!" : `❌ Wrong! The correct answer was: ${questionData.answer}`}`)
            .setColor(questionData.color)
            .addFields(
                { name: "Explanation", value: questionData.explanation },
                { name: "References", value: questionData.references.join("\n") }
            )
            .setImage(questionData.image);

        // Mark this message as answered in the history
        const messageHistory = readMessageHistory();
        const messageId = interaction.message.id;

        for (let i = 0; i < messageHistory.length; i++) {
            if (messageHistory[i].messageId === messageId) {
                messageHistory[i].answered = true;
                break;
            }
        }

        saveMessageHistory(messageHistory);

        // if (isCorrect) {
        //     const profileData = getUserProfileData(interaction.user.id);
        //     if (profileData.currentScore > 0 && !hasVotedForChao(interaction.user.id)) {
        //         // This is their first correct answer, show Chao choice after updating the trivia result
        //         setTimeout(() => {
        //             showChaoChoice(interaction.user);
        //         }, 1000); // Short delay to make sure trivia answer is shown first
        //     }
        // }

        await interaction.update({ embeds: [embed], components: [] }).then(dailyScoreboard(interaction));
    }
};

const chao = async (interaction) => {
    console.log("✅ /chao command executed!");
    console.log("Interaction details:", interaction);
    const userId = interaction.user.id;
    const stats = getChaoStats();
    const visual = generateChaoVisual(stats);

    // Check if user has voted
    const hasVoted = hasVotedForChao(userId);
    const userVote = hasVoted ?
        readChaoVotes().find(vote => vote.userId === userId).chaoType :
        null;

    // Determine embed color
    let embedColor = '#3498DB'; // Default: Blue
    if (userVote === 'hero') embedColor = '#3498DB'; // Blue for Hero Chao
    else if (userVote === 'dark') embedColor = '#E74C3C'; // Red for Dark Chao

    // Create embed
    const embed = new EmbedBuilder()
        .setTitle('🥚 Chao Garden Statistics 🥚')
        .setDescription(`Current Chao preferences among Sonic Trivia players:\n\n${visual}`)
        .setColor(embedColor)
        .setImage('https://cdn.discordapp.com/attachments/677053170676924447/1352444976906109018/chao.png?ex=67de0a09&is=67dcb889&hm=9007d026867861f92fdb49e2337f64b145da064d266a095cd510f3a2092084cb&');

    // Add user's choice if they voted
    if (hasVoted) {
        embed.addFields({
            name: 'Your Choice',
            value: `You chose the ${userVote === 'hero' ? 'Hero Chao 🟦' : 'Dark Chao 🟥'}.`,
            inline: false
        });
    } else {
        embed.addFields({
            name: 'Your Choice',
            value: 'You haven\'t chosen a Chao yet. Answer a trivia question correctly to make your choice!',
            inline: false
        });
    }

    return interaction.reply({ embeds: [embed] });
};


const info = async (interaction) => {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ League Trivia Bot - Information ⚔️')
        .setColor('#E63946')
        .setDescription('A daily trivia bot for League of Legends fans! Test your knowledge and compete with other players.')
        .addFields(
            {
                name: '📝 How It Works',
                value: 'Once registered, you will receive a daily League of Legends trivia question at 1:00 PM CET.\n' +
                    'Each question has multiple choices - choose wisely to build your streak and earn points!\n' +
                    'Answer correctly to increase your score and maintain your streak.'
            },
            {
                name: '⏰ Daily Schedule',
                value: 'Questions are sent via DM at 1:00 PM CET each day.'
            },
            {
                name: '🎮 Commands',
                value: '`/register` - Sign up for daily trivia questions\n' +
                    '`/unregister` - Stop receiving daily questions\n' +
                    '`/profile` - View your personal stats and progress\n' +
                    '`/scoreboard` - See the top 10 players and your ranking\n' +
                    '`/privacy` - Toggle your visibility on the scoreboard\n' +
                    '`/info` - Display this information'
            },
            {
                name: '🏆 Scoring System',
                value: '• Each correct answer earns 1 point\n' +
                    '• Consecutive correct answers build your streak\n' +
                    '• Incorrect answers reset your streak to 0\n' +
                    '• Your highest streak is recorded for bragging rights!'
            },
            {
                name: '💡 Trivia Tips',
                value: '• Questions cover champions, lore, esports, and game mechanics\n' +
                    '• Read carefully - some answers may be tricky\n' +
                    '• If you miss a day, your streak will not be affected'
            },
            {
                name: '🤖 Other Bots by Careless Hangman',
                value: '[Check out more bots here!](https://discord.com/oauth2/authorize?client_id=1341205552558243870)'
            }
        )
        .setFooter({ text: 'Disclaimer: Some information might be incorrect. If you find any errors, please contact carelesshangman (command coming soon).' });

    return interaction.reply({ embeds: [embed] });
};

const listQuestions = async (interaction) => {
    // Optional: Check if user has admin permissions
    // if (!interaction.member.permissions.has('ADMINISTRATOR')) {
    //     return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
    // }

    const questions = triviaQuestionsSonic;

    // Create chunks of questions to avoid Discord's message length limitations
    const chunkSize = 10;
    const chunks = [];

    for (let i = 0; i < questions.length; i += chunkSize) {
        chunks.push(questions.slice(i, i + chunkSize));
    }

    // Reply with the first chunk
    await interaction.reply({ content: "📋 Listing all trivia questions (1/" + chunks.length + "):", ephemeral: true });

    // Send each chunk
    for (let i = 0; i < chunks.length; i++) {
        const questionChunk = chunks[i];
        let message = `**Questions ${i * chunkSize} - ${Math.min((i + 1) * chunkSize - 1, questions.length - 1)}**\n\n`;

        questionChunk.forEach((q, index) => {
            const actualIndex = i * chunkSize + index;
            message += `**Index ${actualIndex}:** ${q.question}\n`;
            message += `Answer: ${q.answer}\n\n`;
        });

        // First chunk is already sent as the reply
        if (i === 0) {
            await interaction.editReply({ content: message, ephemeral: true });
        } else {
            await interaction.followUp({ content: message, ephemeral: true });
        }
    }
};

let commands = [
    { name: 'register', description: 'Register for daily trivia', execute: registerUser },
    { name: 'unregister', description: 'Unregister from daily trivia', execute: unregisterUser },
    { name: 'profile', description: 'View your League Trivia profile and stats', execute: profile },
    { name: 'scoreboard', description: 'View the top 10 League Trivia players', execute: scoreboard },
    { name: 'privacy', description: 'Toggle your visibility on the scoreboard', execute: privacy },
];

if(process.env.LOCAL==="true"){
    commands.push(
        { name: 'listquestions', description: 'List all trivia questions with their indices', execute: listQuestions }
    )
}

client.on('interactionCreate', async interaction => {
    console.log('interactionCreate', interaction);
    if (interaction.isCommand()) {
        console.log("it is a command");
        const command = client.commands.get(interaction.commandName);
        console.log(command);
        if (command) await command.execute(interaction);
    }
    else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
});

// const dailyJob = () => {
//     sendDailyQuiz
// }

let sendDMJob;

if (process.env.LOCAL === "false") {
    sendDMJob = new CronJob('0 13 * * *', sendDailyQuiz, null, true, SLOVENIA_TIMEZONE);
}
else{
    sendDMJob = new CronJob('*/2 * * * *', sendDailyQuiz, null, true, SLOVENIA_TIMEZONE);
}

const express = require('express');
const bodyParser = require('body-parser');
const nacl = require('tweetnacl');
const ngrok = require('ngrok');

const DISCORD_PUBLIC_KEY = process.env.PUBLIC_KEY;

const app = express();
app.use(bodyParser.json());

function verifySignature(req) {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const body = JSON.stringify(req.body);

    if (!signature || !timestamp) {
        return false;
    }

    try {
        const isVerified = nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, 'hex'),
            Buffer.from(DISCORD_PUBLIC_KEY, 'hex')
        );
        return isVerified;
    } catch (err) {
        console.log("Signature verification failed:", err);
        return false;
    }
}

app.post('/discord-webhook', (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send("Invalid signature");
    }

    const event = req.body.event;

    console.log(req.body.event);

    if (event && event.type === "APPLICATION_AUTHORIZED") {
        const userId = event.data.user.id;

        console.log(`Received APPLICATION_AUTHORIZED event for user: ${userId}`);

        const embed = new EmbedBuilder()
            .setTitle('⚔️ League Trivia Bot - Information ⚔️')
            .setColor('#E63946')
            .setDescription('A daily trivia bot for League of Legends fans! Test your knowledge and compete with other players.')
            .addFields(
                {
                    name: '📝 How It Works',
                    value: 'Once registered, you will receive a daily League of Legends trivia question at 1:00 PM CET.\n' +
                        'Each question has multiple choices - choose wisely to build your streak and earn points!\n' +
                        'Answer correctly to increase your score and maintain your streak.'
                },
                {
                    name: '⏰ Daily Schedule',
                    value: 'Questions are sent via DM at 1:00 PM CET each day.'
                },
                {
                    name: '🎮 Commands',
                    value: '`/register` - Sign up for daily trivia questions\n' +
                        '`/unregister` - Stop receiving daily questions\n' +
                        '`/profile` - View your personal stats and progress\n' +
                        '`/scoreboard` - See the top 10 players and your ranking\n' +
                        '`/privacy` - Toggle your visibility on the scoreboard\n' +
                        '`/info` - Display this information'
                },
                {
                    name: '🏆 Scoring System',
                    value: '• Each correct answer earns 1 point\n' +
                        '• Consecutive correct answers build your streak\n' +
                        '• Incorrect answers reset your streak to 0\n' +
                        '• Your highest streak is recorded for bragging rights!'
                },
                {
                    name: '💡 Trivia Tips',
                    value: '• Questions cover champions, lore, esports, and game mechanics\n' +
                        '• Read carefully - some answers may be tricky\n' +
                        '• If you miss a day, your streak will not be affected'
                },
                {
                    name: '🤖 Other Bots by Careless Hangman',
                    value: '[Check out more bots here!](https://discord.com/oauth2/authorize?client_id=1341205552558243870)'
                }
            )
            .setFooter({ text: 'Disclaimer: Some information might be incorrect. If you find any errors, please contact carelesshangman (command coming soon).' });



        const registerButton = new ButtonBuilder()
            .setCustomId('register_button')
            .setLabel('Register')
            .setStyle(ButtonStyle.Primary);

// Create an ActionRow to hold the button
        const row = new ActionRowBuilder().addComponents(registerButton);

        client.users.fetch(userId)
            .then(user => {
                user.send({ embeds: [embed],
                    components: [row]
                })
                    .then(() => console.log(`Welcome message to user: ${userId}`))
                    .catch(error => console.error("Error sending message:", error));
            })
            .catch(error => console.error("Error fetching user:", error));
    } else {
        console.log('Received event:', JSON.stringify(event, null, 2));
    }

    // If it's a security ping (type 1), respond with a type 1 acknowledgment
    if (req.body.type === 1) {
        console.log("Received security ping (type 1). Responding with type 1.");
        return res.json({ type: 1 }); // This is the correct response for a ping
    }

    // Handle the actual events (e.g., APPLICATION_AUTHORIZED)


    res.json({ status: "Webhook received" });
});

const PORT = 5000;
console.log(process.env.LOCAL)
async function startNgrok() {
    if (process.env.LOCAL === "false") {
        console.log("🌍 Production environment detected. Skipping ngrok tunnel.");
        return;
    }
    console.log(`Starting Ngrok tunnel.`);
    try {
        const ngrok = require('ngrok');
        await ngrok.kill(); // Kill any existing ngrok instances
        const url = await ngrok.connect(PORT);
        console.log(`🚀 Webhook URL: ${url}/discord-webhook`);
    } catch (error) {
        console.error("❌ Failed to start ngrok:", error);
    }
}

app.listen(PORT, startNgrok);

client.on("error", console.error);

client.commands = new Collection();

commands.forEach(cmd => client.commands.set(cmd.name, cmd));
console.log("📜 Commands loaded:", client.commands.keys());

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    await client.application.commands.set(commands);

    const globalCommands = await client.application.commands.fetch();
    console.log("🌍 Global Commands:", globalCommands.map(cmd => cmd.name));

    //sendScoreboardJob.start();
    sendDMJob.start();
});

client.login(process.env.TOKEN);

/*
964485110294532106
314036523945295872
312822535513440267
 */

//TODO: add disclaimer for users that some info might be incorrect, add a report button and add it to msg server
//TODO: add photos and questions
//TODO: add system that checks if user is in game
