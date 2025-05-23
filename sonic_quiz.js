const triviaQuestionsSonic = [
    {
        question: "What is the name of the scientific institute where Jayce and Viktor first collaborated?",
        options: ["The University of Piltover", "Heimerdinger Research Center", "Stanwick University"],
        answer: "The University of Piltover",
        explanation: "Jayce and Viktor met at The University of Piltover, where they began their groundbreaking research into hextech technology.",
        references: ["Arcane (Netflix Series, 2021)", "League of Legends Champion Lore"],
        color: "#4ECDC4",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354461456938045532/latest.png?ex=67e56008&is=67e40e88&hm=4af9f8972c1a887076be92de357d628aced7e60170d5d028e655379baf666ce0&"
    },
    {
        question: "Which Noxian general is known as the 'Hand of Noxus'?",
        options: ["Darius", "Swain", "Draven"],
        answer: "Darius",
        explanation: "Darius is a renowned Noxian general who embodies the ruthless military might of his nation, earning him the title 'Hand of Noxus'.",
        references: ["League of Legends Champion Lore", "Noxus Faction Background"],
        color: "#C7403F",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354461586743623870/latest.png?ex=67e56026&is=67e40ea6&hm=c99bdf6380b435e81f4073da33cbf172842f4421efabb0e5e961a303474f75c3&"
    },
    {
        question: "What is the name of the ancient magical language used by Ryze?",
        options: ["Runic", "Arcane Script", "Primordial Tongue"],
        answer: "Runic",
        explanation: "Ryze is a master of the Runic language, an ancient magical script that allows him to understand and manipulate magical energies.",
        references: ["Ryze Champion Lore", "League of Legends Universe"],
        color: "#8E44AD",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354461712002056367/latest.png?ex=67e56044&is=67e40ec4&hm=474ee5ef8ca82d5659bb9e0f95abe6026542b4fd63b590716c1eb0b509ba69b1&"
    },
    {
        question: "In Arcane, what traumatic event transforms Jinx from Powder to her current persona?",
        options: ["Vander's death", "Silco's Betrayal", "The Shimmer Experiment"],
        answer: "Vander's death",
        explanation: "Vander's death, which Powder believes she caused and which results in the death of many, including her adoptive family, marks her psychological transformation into Jinx.",
        references: ["Arcane (Netflix Series, 2021)", "Vi and Jinx Lore"],
        color: "#3498DB",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354462144044859474/50ff9a4a21f7b8596003e91d74081de5.png?ex=67ebf82b&is=67eaa6ab&hm=1c16b34c39e0d1c7f6bb83970b45a256c5945a6ac91a950e8afc2f94b28e8793&"
    },
    {
        question: "What is the name of the chemical substance that grants superhuman abilities in Zaun?",
        options: ["Hextech", "Chemtech", "Shimmer"],
        answer: "Shimmer",
        explanation: "Shimmer is a highly addictive and transformative substance created in Zaun that grants temporary superhuman strength and abilities, often with devastating side effects.",
        references: ["Arcane (Netflix Series, 2021)", "Zaun Lore"],
        color: "#2ECC71",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354461920505237807/LeagueofLegends_Arcane_Season1_Episode7_Viktor_Shimmer.png?ex=67e56076&is=67e40ef6&hm=90837075d300ca2265f0e1418914a72715c365fa0530a45b0032ad48f4991fbe&"
    },
    {
        question: "What is the name of the organization that Caitlyn belongs to in Piltover?",
        options: ["Piltover Wardens", "Sheriff's Department", "Enforcers"],
        answer: "Enforcers",
        explanation: "Caitlyn is a top enforcer in Piltover, known for her exceptional investigative skills and precision with her hextech rifle.",
        references: ["Arcane (Netflix Series, 2021)", "Caitlyn Champion Lore"],
        color: "#34495E",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354462009961480233/latest.png?ex=67e5608b&is=67e40f0b&hm=6a408e39f2962483a789b388f55554286ced8a17d38fcec2a221e31b127e1034&"
    },
    {
        question: "Who adopted Jinx and Vi as children in the undercity?",
        options: ["Vander", "Silco", "Marcus"],
        answer: "Vander",
        explanation: "Vander was a former revolutionary who became a protector of the undercity, taking in Vi and Powder (Jinx) after their parents' death.",
        references: ["Arcane (Netflix Series, 2021)", "Zaun Lore"],
        color: "#E67E22",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354462144044859474/50ff9a4a21f7b8596003e91d74081de5.png?ex=67e560ab&is=67e40f2b&hm=c0634e6f4b72c5f5362f32803f7d6d0d9950ab56452f88dbd961bd86ee9427c9&"
    },
    {
        question: "What is the primary magical resource that powers technology in Piltover?",
        options: ["Arcane Energy", "Hextech", "Chemtech"],
        answer: "Hextech",
        explanation: "Hextech is a revolutionary technology that harnesses magical crystals to create powerful and precise technological innovations in Piltover.",
        references: ["Arcane (Netflix Series, 2021)", "Piltover Technological Lore"],
        color: "#3498DB",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354462212562882861/latest.png?ex=67e560bc&is=67e40f3c&hm=9de98b44d991f5b38be82cc06a6b58616809df9ada008998e808c9ab668be34c&"
    },
    {
        question: "Which champion is known as the Virtuoso?",
        options: ["Jhin", "Yasuo", "Zed"],
        answer: "Jhin",
        explanation: "Jhin is a serial killer who views murder as an art form, treating each kill as a meticulously planned performance, hence his title 'the Virtuoso'.",
        references: ["Jhin Champion Lore", "Ionia Faction Background"],
        color: "#E74C3C",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354462410639151365/5e3b70f025f946e810edae941c661766.gif?ex=67e560eb&is=67e40f6b&hm=71d1265f67318d53d9a3609faa11bc1c12b7f6aa9135d88755afa1565f490eb9&"
    },
    {
        question: "What is the primary homeland of Garen and Lux?",
        options: ["Demacia", "Noxus", "Freljord"],
        answer: "Demacia",
        explanation: "Garen and Lux are siblings from Demacia, a kingdom known for its strong anti-magic stance and militaristic culture.",
        references: ["Garen and Lux Champion Lore", "Demacia Faction Background"],
        color: "#2980B9",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357708289827410011/800px-Demacia_LoR_Background.png?ex=67f1d8a1&is=67f08721&hm=6581185f2d5eb5a44b7ef703fd4f10f999d145f1f004502a472a159e4f00779d&"
    },
    {
        question: "Who is the primary antagonist in Arcane's first season?",
        options: ["Silco", "Vander", "Marcus"],
        answer: "Silco",
        explanation: "Silco is a complex antagonist who becomes a father figure to Jinx, controlling much of the underground economy in Zaun and opposing Vander's peaceful approach.",
        references: ["Arcane (Netflix Series, 2021)", "Zaun Lore"],
        color: "#E74C3C",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1358058053106139196/205de8f137a978559d62c130ea3db17b.gif?ex=67f2759f&is=67f1241f&hm=4b41e65da25f70728c24af2ab868a8a62efad328de64728dc49293d480a6d094&"
    },
    {
        question: "What is the full name of Akali?",
        options: ["Akali Jhomen Tethi", "Akali Govos Khada", "Akali Lightshield V"],
        answer: "Akali Jhomen Tethi",
        "explanation": "Although many champions are known by a single name, Akali’s full name is actually 'Akali Jhomen Tethi'.",
        "references": ["League of Legends Official Website", "Riot Games Lore"],
        color: "#006400",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1358065955439247513/7bc7c9e13e7fb8afd46fde51280dea52.gif?ex=67f27cfb&is=67f12b7b&hm=2a5a6cd016c335d739c41c498faf42a76890be773a007a895d7182c9c5fed88e&"
    },
    {
        question: "What was the original passive effect of the Banner of Command item?",
        options: ["Empowered minion stats", "Magic resistance aura", "Empower a teammate"],
        answer: "Empowered minion stats",
        explanation: "Banner of Command allowed players to 'promote' a lane minion, turning it into a powerful minion that was immune to magic damage.",
        references: ["League of Legends Season 4-6 Item Pool"],
        color: "#2C3E50",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357708530576130260/d27be67d97155da27775b900d05e9efbc69ddc38v2_00.png?ex=67f1d8da&is=67f0875a&hm=d3d8b4bbfe27de57d4e9d0fd935b1cdf6cdcc3ee3b9923a0983763206f9de945&"
    },
    {
        question: "What was the primary function of the original ZZ'Rot Portal?",
        options: ["Teleport players", "Spawn void monsters", "Spawn void gate"],
        answer: "Create a defensive structure that spawned lane pressure",
        explanation: "ZZ'Rot Portal would spawn a Void Gate that would summon Voidspawn to push lanes automatically, creating constant side lane pressure even when the player was not present.",
        references: ["League of Legends Season 5-7 Item Mechanics"],
        color: "#8E44AD",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357708642794864831/latest.png?ex=67f1d8f5&is=67f08775&hm=285104ff95751a52d25b07788c6c9572909f5b462d40691c3eb738af3f15d8b5&"
    },
    {
        question: "Which item was notorious for giving attack speed to supports and was eventually removed?",
        options: ["Avarice Blade", "Sword of the Divine", "Philosopher's Stone"],
        answer: "Sword of the Divine",
        explanation: "Sword of the Divine was a controversial item that provided attack speed and had an active ability to guarantee critical strikes, which was particularly powerful on supports.",
        references: ["League of Legends Early Season Item Mechanics"],
        color: "#E67E22",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357708775158710323/250.png?ex=67f1d915&is=67f08795&hm=f31fd84821780ef8a22187b3de4bc9d8160551f2aef6606113dd8922f14ba152&"
    },
    {
        question: "What was the original unique passive of Heart of Gold?",
        options: ["Health regeneration", "Gold generation", "Armor boost"],
        answer: "Gold generation",
        explanation: "Heart of Gold was a beloved tank item that passively generated additional gold per 10 seconds, making it a staple for support and tank players.",
        references: ["League of Legends Season 2-3 Item Pool"],
        color: "#2ECC71",
        spoiler: false,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357708908034134146/xbjm8zxp72181.png?ex=67f1d934&is=67f087b4&hm=831e7463133f0ecc6aab9bcd4324ab788c3e032dba2f6130ce9c05a2aa85a525&"
    },
    {
        question: "Which removed item allowed players to place a ward that granted true sight?",
        options: ["Oracle's Elixir", "Vision Ward", "Stealth Ward"],
        answer: "Oracle's Elixir",
        explanation: "Oracle's Elixir was a consumable item that gave players true sight, allowing them to detect and reveal invisible units for a limited duration.",
        references: ["League of Legends Vision Mechanics Pre-Season 5"],
        color: "#3498DB",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357709035524198420/360.png?ex=67f1d953&is=67f087d3&hm=ac0f13b2ae7e1796cfc645ed0d5805b0ed2fcd803dade79647bd4df74186afcb&"
    },
    {
        question: "What catastrophic event led to the creation of the Shadow Isles?",
        options: ["The Ruination", "The Void Invasion", "The Rune Wars"],
        answer: "The Ruination",
        explanation: "The Ruination was a magical disaster that transformed the once-beautiful island kingdom into the necromantic nightmare known as the Shadow Isles, corrupting its inhabitants.",
        references: ["Shadow Isles Lore", "Hecarim and Kalista Background"],
        color: "#1ABC9C",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1358060403007029459/Ruination_event_Wild_Rift.png?ex=67f277cf&is=67f1264f&hm=92ba8331800c50e7fd09875ff86d65524c3e8e5948b48b94c54c0b54bed42cfb&"
    },
    {
        question: "Who was the last emperor of the Noxian Empire?",
        options: ["Boram Darkwill", "Cyrus the Conqueror", "Swain"],
        answer: "Boram Darkwill",
        explanation: "Boram Darkwill was the original leader of Noxus, ruling before Swain's rise to power. He established many of the empire's foundational military and expansionist principles.",
        references: ["Noxian Empire Historical Lore", "League of Legends Political Background"],
        color: "#C0392B",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1358060565624393919/01NX029-full.png?ex=67f277f6&is=67f12676&hm=98043deb7c40febb16292ceb97899a140a2c801d57814afd19c90264c059e545&"
    },
    {
        question: "What was the primary reason for the founding of Piltover?",
        options: ["Trade and Commerce", "Magical Research", "Military Expansion"],
        answer: "Trade and Commerce",
        explanation: "Piltover was established as a crucial trade hub, leveraging its geographical position to become the economic center of Runeterra, with innovative hextech technology driving its prosperity.",
        references: ["Piltover Founding Lore", "Runeterra Economic History"],
        color: "#F39C12",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1354461824891748503/800px-Bridge_of_Progress_Map_Preview.png?ex=67f1e69f&is=67f0951f&hm=6fd47f5df272c61524b6534f8b438762c04ea86ca9c8bd15a71234e62a636801&"
    },
    {
        question: "Which event sparked the long-standing conflict between Ionia and Noxus?",
        options: ["The Noxian Invasion", "The Ionian Revolution", "The Magical Uprising"],
        answer: "The Noxian Invasion",
        explanation: "The Noxian Invasion of Ionia was a brutal military campaign that sought to conquer the peaceful nation, leading to a prolonged and devastating conflict that deeply scarred both cultures.",
        references: ["Ionian-Noxian War Lore", "Irelia and Karma's Background"],
        color: "#9B59B6",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1358060745916551380/nki6pvdbv8w61.jpg?ex=67f27821&is=67f126a1&hm=19f6b7cbb791690e8a35096f77c915fcf58e39746791aa55a8658172d43b2829&"
    },
    {
        question: "What magical catastrophe preceded the founding of most human kingdoms in Runeterra?",
        options: ["The Rune Wars", "The Void Incursion", "The Magical Plague"],
        answer: "The Rune Wars",
        explanation: "The Rune Wars were a series of devastating magical conflicts that nearly destroyed civilization, leading to the establishment of kingdoms like Demacia as safe havens from magical destruction.",
        references: ["Runeterra Pre-Modern History", "League of Legends Universe Lore"],
        color: "#34495E",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1356289801040560138/latest.png?ex=67ec06cf&is=67eab54f&hm=059dbdd029ff1f23fba40474cda96813c3f52978448466858135a41556510516&"
    },
    {
        question: "Which champion lacks any canon lore?",
        options: ["Shaco", "Cho'gath", "Kog'maw"],
        answer: ["Shaco", "Cho'gath", "Kog'maw"],
        explanation: "Enjoy the free point because none of these champions — **Shaco**, **Cho'gath**, and **Kog'Maw**, along with a few others — have any official lore in the post-retcon canon.",
        reference: ["Reddit","League of Legends Champion stories", "Necrit"],
        color: "34495E",
        spoiler: true,
        image: "https://cdn.discordapp.com/attachments/677053170676924447/1357797173840056511/unknowns.png?ex=67f182a8&is=67f03128&hm=0e837d3cb84d69f106cb74bf40d5619a88835270177a85ff6995ca00b4cbeaed&"
    }
];

module.exports = triviaQuestionsSonic;