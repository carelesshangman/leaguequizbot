const { Client, GatewayIntentBits, Collection, REST, Routes, ButtonInteraction, AttachmentBuilder, EmbedBuilder, ButtonStyle,
    ActionRowBuilder, ButtonBuilder,
    Partials
} = require('discord.js');
const { CronJob } = require('cron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const sharp = require('sharp');
const zoomInQuiz = require('./zoomin_quiz.js');

require('dotenv').config();

const REGISTERED_USERS_FILE = path.join(__dirname, 'registered_users.csv');
const SENT_QUESTIONS_FILE = path.join(__dirname, 'sent_questions.csv');
const MESSAGE_HISTORY_FILE = path.join(__dirname, 'message_history.csv');

const SLOVENIA_TIMEZONE = 'Europe/Ljubljana';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.User,
        Partials.Message,
        Partials.GuildMember,
        Partials.ThreadMember,
        Partials.Channel
    ]
});
client.commands = new Collection();

const activeZoomInChallenges = new Map();

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
    console.log(questionData);
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
    console.log("sendDailyQuizToUser", userId);
    const messageHistory = readMessageHistory();
    const today = new Date().toISOString().slice(0, 10);

    const questionData = globalQuestionData;
    console.log("question data",questionData);
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

    globalZoomChallenge = null;

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

let globalZoomChallenge = null;

const zoomLevels = [0.1, 0.25, 0.55, 0.8];
const MAX_ATTEMPTS = zoomLevels.length; // 4 attempts before the final reveal

// Start a new zoom challenge for a given user (triggered after trivia answer processing)
async function generateGlobalZoomChallenge() {
    // Pick a random quiz entry from zoomin_quiz.js
    const quizEntry = zoomInQuiz[Math.floor(Math.random() * zoomInQuiz.length)];
    const imagePath = path.join(__dirname, quizEntry.asset);

    // Load the image and get its dimensions
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // Calculate minimum crop dimensions based on the hardest zoom (attempt 1: 10% of the image)
    const minCropWidth = width * zoomLevels[0];
    const minCropHeight = height * zoomLevels[0];

    // Choose a random center point ensuring the smallest crop will be completely inside the image
    const minX = minCropWidth / 2;
    const maxX = width - minCropWidth / 2;
    const minY = minCropHeight / 2;
    const maxY = height - minCropHeight / 2;
    const cx = Math.floor(Math.random() * (maxX - minX) + minX);
    const cy = Math.floor(Math.random() * (maxY - minY) + minY);

    // Pre-generate cropped images for each zoom level for both modes (hard = grayscaled, easy = color)
    const challengeImages = { hard: [], easy: [] };
    for (let i = 0; i < zoomLevels.length; i++) {
        const zoomRatio = zoomLevels[i];
        const cropWidth = Math.floor(width * zoomRatio);
        const cropHeight = Math.floor(height * zoomRatio);
        // Calculate the top-left of the crop rectangle, ensuring it stays within bounds
        const left = Math.max(0, Math.min(cx - Math.floor(cropWidth / 2), width - cropWidth));
        const top = Math.max(0, Math.min(cy - Math.floor(cropHeight / 2), height - cropHeight));

        // Process for easy mode: crop and resize to a fixed height of 600px
        const easyBuffer = await sharp(imagePath)
            .extract({ left, top, width: cropWidth, height: cropHeight })
            .resize({ height: 600 })
            .toBuffer();
        // Process for hard mode: same but with grayscale effect
        const hardBuffer = await sharp(imagePath)
            .extract({ left, top, width: cropWidth, height: cropHeight })
            .resize({ height: 600 })
            .grayscale()
            .toBuffer();

        challengeImages.easy.push(easyBuffer);
        challengeImages.hard.push(hardBuffer);
    }

    // Pre-generate the final full (uncropped) image (resized to height 600) to reveal at the end
    const finalBuffer = await sharp(imagePath)
        .resize({ height: 600 })
        .toBuffer();

    return { quizEntry, images: challengeImages, finalImage: finalBuffer };
}

// Start a new zoom challenge for a given user after trivia completion
async function startZoomInChallenge(userId) {
    // Generate global challenge only once so all users share the same zoom location/images
    if (!globalZoomChallenge) {
        globalZoomChallenge = await generateGlobalZoomChallenge();
    }

    // Save individual challenge state for this user with their own attempt count and mode
    activeZoomInChallenges.set(userId, {
        attempt: 1,
        mode: "hard", // default mode is hard (with grayscale)
        // Reference the global images
        images: globalZoomChallenge.images,
        finalImage: globalZoomChallenge.finalImage,
        quizEntry: globalZoomChallenge.quizEntry,
        messageId: null // to track the challenge message for deletion/updating
    });

    // Send the first challenge message to the user
    await sendZoomChallengeMessage(userId);
}

// Function to send (or update) the zoom challenge message for a given user
async function sendZoomChallengeMessage(userId) {
    const challenge = activeZoomInChallenges.get(userId);
    if (!challenge) return;

    const { attempt, mode, images, quizEntry } = challenge;
    const channel = await client.users.fetch(userId).then(user => user.createDM());

    // On the first attempt in hard mode, include the button to switch to Easy Mode.
    let components = [];
    if (attempt === 1 && mode === "hard") {
        const easyModeButton = new ButtonBuilder()
            .setCustomId('zoom_switch_easy')
            .setLabel('Switch to Easy Mode')
            .setStyle(ButtonStyle.Primary);
        components.push(new ActionRowBuilder().addComponents(easyModeButton));
    }

    // Choose the appropriate image: if attempt <= MAX_ATTEMPTS use the pre-generated cropped image; otherwise, use the final full image.
    let attachment;
    if (attempt <= MAX_ATTEMPTS) {
        const buffer = mode === "hard" ? images.hard[attempt - 1] : images.easy[attempt - 1];
        attachment = new AttachmentBuilder(buffer, { name: 'zoom.jpg' });
    } else {
        attachment = new AttachmentBuilder(challenge.finalImage, { name: 'final.jpg' });
    }

    // Build an embed describing the current attempt
    let description;
    if (attempt <= MAX_ATTEMPTS) {
        description = `**Zoom-In Challenge**\nGuess the champion from this zoomed-in image!\nAttempt ${attempt} of ${MAX_ATTEMPTS}.\n` +
            `You can switch to Easy Mode (disables grayscale) using the button on this first attempt.`;
    } else {
        description = `**Final Reveal**\nThe full image is shown below. The correct answer was **${quizEntry.answer.join(", ")}**.`;
    }

    const embed = new EmbedBuilder()
        .setTitle('Zoom-In Challenge')
        .setDescription(description)
        .setColor('#1E90FF')
        .setImage('attachment://' + (attempt <= MAX_ATTEMPTS ? 'zoom.jpg' : 'final.jpg'))
        .setFooter({ text: 'Type your guess in the chat.' });

    // If there's a previous challenge message, delete it
    if (challenge.messageId) {
        try {
            const oldMessage = await channel.messages.fetch(challenge.messageId);
            await oldMessage.delete();
        } catch (error) {
            console.error(`Error deleting previous zoom challenge message for user ${userId}:`, error);
        }
    }

    // Send the new challenge message with the attachment and (if applicable) the easy mode button
    const sentMessage = await channel.send({ embeds: [embed], components, files: [attachment] });
    // Save the new message id for later deletion/updating
    challenge.messageId = sentMessage.id;
    activeZoomInChallenges.set(userId, challenge);
}

// Process a DM from a user who is currently in a zoom challenge
async function processZoomGuess(message) {
    const userId = message.author.id;
    const challenge = activeZoomInChallenges.get(userId);
    if (!challenge) return;

    const guess = message.content.trim().toLowerCase();
    // Accept if the guess exactly matches any of the answers (ignoring capitalization)
    const correctAnswers = challenge.quizEntry.answer.map(ans => ans.toLowerCase());
    const isCorrect = correctAnswers.some(ans => ans === guess);

    if (isCorrect) {
        // Award points: 2 for hard mode, 1 for easy mode
        const points = challenge.mode === "hard" ? 2 : 1;
        addExtraPoints(userId, points);

        // Send a final embed revealing the full image and the correct answer
        const channel = await message.author.createDM();
        const finalEmbed = new EmbedBuilder()
            .setTitle('Zoom-In Challenge Completed!')
            .setDescription(`Correct! The answer was **${challenge.quizEntry.answer.join(", ")}**.\n` +
                `You earned ${points} point${points > 1 ? 's' : ''} in this challenge.`)
            .setColor('#1E90FF')
            .setImage('attachment://final.jpg');
        const finalAttachment = new AttachmentBuilder(challenge.finalImage, { name: 'final.jpg' });
        await channel.send({ embeds: [finalEmbed], files: [finalAttachment] });
        await scoreboardFromUserId(userId);

        // Clear the challenge state for this user
        activeZoomInChallenges.delete(userId);
        return;
    } else {
        // Incorrect guess: increment the attempt count
        challenge.attempt++;
        if (challenge.attempt > MAX_ATTEMPTS) {
            // Out of attempts: send the final reveal message
            const channel = await message.author.createDM();
            const finalEmbed = new EmbedBuilder()
                .setTitle('Zoom-In Challenge Over')
                .setDescription(`Out of attempts! The correct answer was **${challenge.quizEntry.answer.join(", ")}**.`)
                .setColor('#FF0000')
                .setImage('attachment://final.jpg');
            const finalAttachment = new AttachmentBuilder(challenge.finalImage, { name: 'final.jpg' });
            await channel.send({ embeds: [finalEmbed], files: [finalAttachment] });
            activeZoomInChallenges.delete(userId);
        } else {
            // Otherwise, send the next (less zoomed-in) image
            await sendZoomChallengeMessage(userId);
        }
    }
}

// Helper to add extra points to the user’s profile (in addition to the trivia point)
function addExtraPoints(userId, points) {
    const profileData = getUserProfileData(userId);
    profileData.currentScore += points;
    saveProfileData(profileData);
    // OPTIONAL: To fix the hotstreak bug, you might want to add logic here to reset the streak
    // if the user did not complete the daily quiz. For example:
    // if (!hasCompletedDailyQuiz(userId)) {
    //     profileData.currentStreak = 0;
    // }
}

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

const scoreboardFromUserId = async (userId) => {
    // Fetch the user object from Discord
    const user = await client.users.fetch(userId);
    const displayName = user.username; // using username for DMs

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
                    const fetchedUser = await client.users.fetch(userProfile.userId);
                    playerDisplayName = userProfile.visibility ? fetchedUser.username : '||Hidden||';
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
        name: '🏆 Your Information',
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

    // Send the embed as a DM to the user
    return user.send({ embeds: [embed] });
};


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
        name: '🏆 Your Information',
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

    if (interaction.customId === 'zoom_switch_easy') {
        const userId = interaction.user.id;
        const challenge = activeZoomInChallenges.get(userId);
        if (challenge && challenge.mode === "hard") {
            challenge.mode = "easy"; // Switch mode
            // Update the challenge message to reflect the new mode (and remove the button)
            await sendZoomChallengeMessage(userId);
            await interaction.update({ content: "Switched to Easy Mode.", components: [] });
        }
    }

    if (interaction.customId.startsWith("trivia_")) {
        const questionData = globalQuestionData;
        if (!questionData) {
            await interaction.reply({ content: "⚠️ No active trivia question found.", ephemeral: true });
            return;
        }

        const selectedAnswer = interaction.component.label;

        // Determine if the selected answer is correct
        let isCorrect = false;
        if (questionData.answer) {
            if (Array.isArray(questionData.answer)) {
                isCorrect = questionData.answer.includes(selectedAnswer);
            } else {
                isCorrect = selectedAnswer === questionData.answer;
            }
        }

        // Safely generate a string to display the correct answer(s)
        const correctAnswerDisplay = questionData.answer
            ? (Array.isArray(questionData.answer)
                ? questionData.answer.join(", ")
                : questionData.answer)
            : "No answer provided";

        // For references, check both 'references' and 'reference'
        const referencesArray = questionData.references || questionData.reference || [];
        const referencesDisplay = Array.isArray(referencesArray)
            ? referencesArray.join("\n")
            : referencesArray;

        // Update user score based on correctness
        updateUserScore(interaction.user.id, isCorrect);

        const embed = getTriviaEmbed(questionData)
            .setDescription(`**${questionData.question}**\n\nYour Answer: ${selectedAnswer}\n\n${isCorrect ? "✅ Correct!" : `❌ Wrong! The correct answer was: ${correctAnswerDisplay}`}`)
            .setColor(questionData.color)
            .addFields(
                { name: "Explanation", value: questionData.explanation },
                { name: "References", value: referencesDisplay }
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

        //here

        await interaction.update({ embeds: [embed], components: [] });

        await startZoomInChallenge(interaction.user.id);
    }

};


const info = async (interaction) => {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ League Trivia Bot - Information ⚔️')
        .setColor('#E63946')
        .setDescription('A daily trivia bot for League of Legends fans! Test your knowledge and compete with other players.')
        .addFields(
            {
                name: '📝 How It Works',
                value: 'Once registered, you will receive a daily League of Legends trivia question at 9:00 PM CET.\n' +
                    'Each question has multiple choices - choose wisely to build your streak and earn points!\n' +
                    'Answer correctly to increase your score and maintain your streak.'
            },
            {
                name: '⏰ Daily Schedule',
                value: 'Questions are sent via DM at 9:00 PM CET each day.'
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


const INFO_FILE = path.join(__dirname, 'info.csv');

// Function to read info.csv (or create if not present)
const readInfo = () => {
    if (!fs.existsSync(INFO_FILE)) {
        // File doesn't exist: create it with the current version from .env
        fs.writeFileSync(INFO_FILE, `version\n${process.env.VERSION}`);
        return { version: 0 };
    }
    const lines = fs.readFileSync(INFO_FILE, 'utf8').split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        // File exists but has no version info, so initialize it
        fs.writeFileSync(INFO_FILE, `version\n${process.env.VERSION}`);
        return { version: process.env.VERSION };
    }
    // Assume first line is header and second line is the version number
    return { version: lines[1].trim() };
};

// Function to save new version into info.csv
const saveInfo = (newVersion) => {
    fs.writeFileSync(INFO_FILE, `version\n${newVersion}`);
};

// Function to check version and, if changed, send update notification
const checkVersionAndNotify = async () => {
    const currentInfo = readInfo();
    const envVersion = process.env.VERSION;

    if (currentInfo.version !== envVersion) {
        // Version change detected, parse patch notes from .env
        // (Assumes PATCH_NOTES is a comma-separated list in your .env file)
        const patchNotesRaw = process.env.PATCH_NOTES || '';
        const patchNotes = patchNotesRaw.split(',').map(note => note.trim()).filter(note => note);

        // Read custom message from .env (if provided)
        const customMessage = process.env.CUSTOM_MESSAGE || '';

        const rawNextVersion = process.env.NEXT_VERSION || '';
        const nextVersion = rawNextVersion.split(',').map(note => note.trim()).filter(note => note);


        // Update the info file with the new version
        saveInfo(envVersion);

        // Create an embedded update message
        const updateEmbed = new EmbedBuilder()
            .setTitle('🆕 League Trivia Bot Update!')
            .setDescription(`A new version (**${envVersion}**) of the bot has been released!`)
            .setColor('#00FF00')
            .setTimestamp();

        // Add the custom message (if available) at the top of the embed
        if (customMessage) {
            updateEmbed.addFields({
                name: 'A message from the creator:',
                value: customMessage
            });
        }

        // Add the patch notes
        updateEmbed.addFields({
            name: 'Patch Notes',
            value: patchNotes.length > 0
                ? patchNotes.map(note => `• ${note}`).join('\n')
                : 'No patch notes available.'
        });

        updateEmbed.addFields({
            name: 'Next Up',
            value: nextVersion.length > 0
                ? nextVersion.map(note => `• ${note}`).join('\n')
                : 'No patch notes available.'
        });

        updateEmbed.setImage("https://cdn.discordapp.com/attachments/677053170676924447/1357786722540327136/kda-gragas.gif?ex=67f178ed&is=67f0276d&hm=68a20d56a29c3a035186304b96e462c8888233b908a9e1656c15db5ec745d412&")

        // Read all registered user IDs and send the update message
        const registeredUsers = readCSV(REGISTERED_USERS_FILE);
        for (const userId of registeredUsers) {
            try {
                const user = await client.users.fetch(userId);
                await user.send({ embeds: [updateEmbed] });
            } catch (error) {
                console.error(`Failed to send update notification to user ${userId}:`, error);
            }
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
    sendDMJob = new CronJob('0 21 * * *', sendDailyQuiz, null, true, SLOVENIA_TIMEZONE);
}
else{
    sendDMJob = new CronJob('* * * * *', sendDailyQuiz, null, true, SLOVENIA_TIMEZONE);
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
                    value: 'Once registered, you will receive a daily League of Legends trivia question at 9:00 PM CET.\n' +
                        'Each question has multiple choices - choose wisely to build your streak and earn points!\n' +
                        'Answer correctly to increase your score and maintain your streak.'
                },
                {
                    name: '⏰ Daily Schedule',
                    value: 'Questions are sent via DM at 9:00 PM CET each day.'
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

client.on('messageCreate', async message => {
    if (message.author.bot || message.guild) return; // Only process DMs
    if (activeZoomInChallenges.has(message.author.id)) {
        await processZoomGuess(message);
    }
});

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    await client.application.commands.set(commands);
    await client.user.setPresence({
        status: 'online',
        activities: [{
            name: 'lots of data',
            type: 3
        }]
    });

    const globalCommands = await client.application.commands.fetch();
    console.log("🌍 Global Commands:", globalCommands.map(cmd => cmd.name));

    //sendScoreboardJob.start();
    await checkVersionAndNotify();
    sendDMJob.start();
});

client
    .on("debug", console.log)
    .on("warn", console.log)

client.login(process.env.TOKEN);

/*
964485110294532106
314036523945295872
312822535513440267
 */

//TODO: add disclaimer for users that some info might be incorrect, add a report button and add it to msg server
//TODO: add photos and questions
//TODO: add system that checks if user is in game
