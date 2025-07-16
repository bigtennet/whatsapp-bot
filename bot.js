const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const P = require('pino');
const fetch = require('node-fetch');
const qrcode = require('qrcode-terminal');
const crypto = require('crypto');

// Bot Creator Info
const CREATOR_INFO = {
    name: "BIG TENNET",
    ig: "bigtennet",
    tiktok: "therealbigtennet", 
    website: "https://tennetteam.com"
};

// Sudo users system
let sudoUsers = new Set();

// Bot owner configuration - Replace with your actual phone number
const BOT_OWNER = 'YOUR_PHONE_NUMBER@s.whatsapp.net'; // e.g., '2348124269148@s.whatsapp.net'

// Load sudo users from database
function loadSudoUsers() {
    try {
        const db = loadDB();
        if (db.sudoUsers) {
            sudoUsers = new Set(db.sudoUsers);
        }
    } catch (e) {
        console.log('No sudo users found, starting fresh');
        sudoUsers = new Set();
    }
    
    // Always add bot owner as sudo user
    if (BOT_OWNER !== 'YOUR_PHONE_NUMBER@s.whatsapp.net') {
        sudoUsers.add(BOT_OWNER);
        console.log(`✅ Bot owner ${BOT_OWNER} automatically added as sudo user`);
    }
}

// Save sudo users to database
function saveSudoUsers() {
    try {
        const db = loadDB();
        db.sudoUsers = Array.from(sudoUsers);
        saveDB(db);
    } catch (e) {
        console.error('Failed to save sudo users:', e);
    }
}

// Check if user has sudo permissions
function isSudoUser(userId) {
    return sudoUsers.has(userId);
}

// Check if user is bot owner
function isBotOwner(userId) {
    return userId === BOT_OWNER;
}

// Check if user can use the bot (bot owner or sudo user)
function canUseBot(userId) {
    return isBotOwner(userId) || isSudoUser(userId);
}

// Check if user is admin or sudo user
async function hasAdminPermission(sock, msg) {
    const userId = msg.key.participant || msg.key.remoteJid;
    
    // Check if user is bot owner (always has permissions)
    if (userId === BOT_OWNER) {
        return true;
    }
    
    // Check if user is sudo
    if (isSudoUser(userId)) {
        return true;
    }
    
    // Check if user is group admin
    try {
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participant = groupMetadata.participants.find(p => p.id === userId);
        return participant && participant.admin;
    } catch (e) {
        return false;
    }
}

// Command documentation with detailed explanations and usage examples
const COMMAND_DOCS = {
    '!ping': {
        description: "Check if the bot is online and responsive",
        usage: "!ping",
        example: "!ping",
        category: "Utility"
    },
    '!debug': {
        description: "Get detailed debug information about the current chat and bot status",
        usage: "!debug",
        example: "!debug",
        category: "Utility"
    },
    '!help': {
        description: "Get help information about the bot and its features",
        usage: "!help [command]",
        example: "!help !weather",
        category: "Utility"
    },
    '!creator': {
        description: "Get information about the bot creator and social media links",
        usage: "!creator",
        example: "!creator",
        category: "Info"
    },
    '!time': {
        description: "Get the current server time",
        usage: "!time",
        example: "!time",
        category: "Utility"
    },
    '!datediff': {
        description: "Calculate the difference between two dates",
        usage: "!datediff <date1> <date2>",
        example: "!datediff 2024-01-01 2024-12-31",
        category: "Utility"
    },
    '!timein': {
        description: "Get the current time in a specific city or timezone",
        usage: "!timein <city/timezone>",
        example: "!timein London",
        category: "Utility"
    },
    '!shorten': {
        description: "Shorten a long URL using a URL shortener service",
        usage: "!shorten <url>",
        example: "!shorten https://www.google.com",
        category: "Utility"
    },
    '!tempmail': {
        description: "Generate a temporary email address for testing",
        usage: "!tempmail",
        example: "!tempmail",
        category: "Utility"
    },
    '!color': {
        description: "Get information about a color from its hex code",
        usage: "!color <hex_code>",
        example: "!color #FF0000",
        category: "Utility"
    },
    '!password': {
        description: "Generate a random secure password",
        usage: "!password [length]",
        example: "!password 12",
        category: "Utility"
    },
    '!motivate': {
        description: "Get a random motivational quote to boost your day",
        usage: "!motivate",
        example: "!motivate",
        category: "Fun"
    },
    '!joke': {
        description: "Get a random joke to make you laugh",
        usage: "!joke",
        example: "!joke",
        category: "Fun"
    },
    '!quote': {
        description: "Get a random inspirational quote from famous people",
        usage: "!quote",
        example: "!quote",
        category: "Fun"
    },
    '!trivia': {
        description: "Get a random trivia question to test your knowledge",
        usage: "!trivia",
        example: "!trivia",
        category: "Fun"
    },
    '!weather': {
        description: "Get current weather information for a city",
        usage: "!weather <city>",
        example: "!weather New York",
        category: "Info"
    },
    '!country': {
        description: "Get information about a country",
        usage: "!country <country_name>",
        example: "!country Nigeria",
        category: "Info"
    },
    '!coin': {
        description: "Flip a coin and get heads or tails",
        usage: "!coin",
        example: "!coin",
        category: "Fun"
    },
    '!crypto': {
        description: "Get current cryptocurrency prices",
        usage: "!crypto <coin_symbol>",
        example: "!crypto BTC",
        category: "Info"
    },
    '!reverse': {
        description: "Reverse the text you provide",
        usage: "!reverse <text>",
        example: "!reverse Hello World",
        category: "Fun"
    },
    '!rps': {
        description: "Play Rock, Paper, Scissors against the bot",
        usage: "!rps <rock|paper|scissors>",
        example: "!rps rock",
        category: "Games"
    },
    '!textart': {
        description: "Convert text into ASCII art",
        usage: "!textart <text>",
        example: "!textart Hello",
        category: "Fun"
    },
    '!poll': {
        description: "Create a poll with Yes/No/Maybe options",
        usage: "!poll <question>",
        example: "!poll Should we have pizza for lunch?",
        category: "Group"
    },
    '!vote': {
        description: "Vote in the current poll (1=Yes, 2=No, 3=Maybe)",
        usage: "!vote <number>",
        example: "!vote 1",
        category: "Group"
    },
    '!xp': {
        description: "Earn XP points by using this command",
        usage: "!xp",
        example: "!xp",
        category: "Fun"
    },
    '!rank': {
        description: "Check your XP rank among all users",
        usage: "!rank",
        example: "!rank",
        category: "Fun"
    },
    '!define': {
        description: "Get the definition of a word",
        usage: "!define <word>",
        example: "!define awesome",
        category: "Info"
    },
    '!binary': {
        description: "Convert text to binary code",
        usage: "!binary <text>",
        example: "!binary Hello",
        category: "Utility"
    },
    '!unbinary': {
        description: "Convert binary code back to text",
        usage: "!unbinary <binary>",
        example: "!unbinary 1001000 1100101 1101100 1101100 1101111",
        category: "Utility"
    },
    '!emoji': {
        description: "Get emoji information and variations",
        usage: "!emoji <emoji>",
        example: "!emoji 😀",
        category: "Fun"
    },
    '!countdown': {
        description: "Start a countdown timer in seconds",
        usage: "!countdown <seconds>",
        example: "!countdown 60",
        category: "Utility"
    },
    '!bible': {
        description: "Get a random Bible verse",
        usage: "!bible",
        example: "!bible",
        category: "Fun"
    },
    '!fact': {
        description: "Get a random interesting fact",
        usage: "!fact",
        example: "!fact",
        category: "Fun"
    },
    '!wordday': {
        description: "Get the word of the day",
        usage: "!wordday",
        example: "!wordday",
        category: "Fun"
    },
    '!list': {
        description: "Show all available commands in the current chat type",
        usage: "!list",
        example: "!list",
        category: "Utility"
    },
    '!catfact': {
        description: "Get a random fact about cats",
        usage: "!catfact",
        example: "!catfact",
        category: "Fun"
    },
    '!dogfact': {
        description: "Get a random fact about dogs",
        usage: "!dogfact",
        example: "!dogfact",
        category: "Fun"
    },
    '!remind': {
        description: "Set a reminder (bot will remind you after specified seconds)",
        usage: "!remind <seconds> <message>",
        example: "!remind 300 Take a break",
        category: "Utility"
    },
    '!uuid': {
        description: "Generate a random UUID (Universally Unique Identifier)",
        usage: "!uuid",
        example: "!uuid",
        category: "Utility"
    },
    '!roll': {
        description: "Roll a dice with specified number of sides",
        usage: "!roll [sides]",
        example: "!roll 20",
        category: "Fun"
    },
    '!palindrome': {
        description: "Check if text is a palindrome (reads same forwards and backwards)",
        usage: "!palindrome <text>",
        example: "!palindrome racecar",
        category: "Fun"
    },
    '!capitalize': {
        description: "Capitalize the first letter of each word in text",
        usage: "!capitalize <text>",
        example: "!capitalize hello world",
        category: "Utility"
    },
    '!echo': {
        description: "Make the bot repeat your message",
        usage: "!echo <text>",
        example: "!echo Hello everyone!",
        category: "Fun"
    },
    '!vv': {
        description: "Manually unlock view-once media (reply to view-once message)",
        usage: "!vv (reply to view-once media)",
        example: "Reply to view-once image with: !vv",
        category: "Media"
    },
    '!viewonce': {
        description: "Get information about the view-once unlocking feature",
        usage: "!viewonce",
        example: "!viewonce",
        category: "Media"
    },
    '!test': {
        description: "Test if the bot is working properly in the current chat",
        usage: "!test",
        example: "!test",
        category: "Utility"
    },
    '!sticker': {
        description: "Convert an image or video to a WhatsApp sticker",
        usage: "!sticker (reply to image/video)",
        example: "Reply to image with: !sticker",
        category: "Media"
    },
    '!tagall': {
        description: "Tag all members in the group (Group only)",
        usage: "!tagall",
        example: "!tagall",
        category: "Group"
    },
    '!kick': {
        description: "Kick a user from the group (Admin only)",
        usage: "!kick <@user>",
        example: "!kick @username",
        category: "Group"
    },
    '!add': {
        description: "Add a user to the group (Admin only)",
        usage: "!add <phone_number>",
        example: "!add 2348124269148",
        category: "Group"
    },
    '!promote': {
        description: "Promote a user to admin (Admin only)",
        usage: "!promote <@user>",
        example: "!promote @username",
        category: "Group"
    },
    '!demote': {
        description: "Demote an admin to member (Admin only)",
        usage: "!demote <@user>",
        example: "!demote @username",
        category: "Group"
    },
    '!ban': {
        description: "Ban a user from the group (Admin only)",
        usage: "!ban <@user>",
        example: "!ban @username",
        category: "Group"
    },
    '!unban': {
        description: "Unban a user from the group (Admin only)",
        usage: "!unban <@user>",
        example: "!unban @username",
        category: "Group"
    },
    '!groupinfo': {
        description: "Get detailed information about the current group",
        usage: "!groupinfo",
        example: "!groupinfo",
        category: "Group"
    },
    '!setdesc': {
        description: "Set the group description (Admin only)",
        usage: "!setdesc <description>",
        example: "!setdesc Welcome to our awesome group!",
        category: "Group"
    },
    '!setname': {
        description: "Set the group name (Admin only)",
        usage: "!setname <name>",
        example: "!setname My Awesome Group",
        category: "Group"
    },
    '!antispam': {
        description: "Configure anti-spam protection (Admin only)",
        usage: "!antispam <on|off>",
        example: "!antispam on",
        category: "Group"
    },
    '!antilink': {
        description: "Configure anti-link protection (Admin only)",
        usage: "!antilink <on|off>",
        example: "!antilink on",
        category: "Group"
    },
    '!wordle': {
        description: "Play Wordle - guess the 5-letter word",
        usage: "!wordle [guess]",
        example: "!wordle HELLO",
        category: "Games"
    },
    '!hangman': {
        description: "Play Hangman - guess the word letter by letter",
        usage: "!hangman [letter]",
        example: "!hangman A",
        category: "Games"
    },
    '!tictactoe': {
        description: "Play Tic Tac Toe against the bot",
        usage: "!tictactoe <position>",
        example: "!tictactoe 5",
        category: "Games"
    },
    '!numberguess': {
        description: "Play Number Guessing game",
        usage: "!numberguess [number]",
        example: "!numberguess 50",
        category: "Games"
    },
    '!wordchain': {
        description: "Play Word Chain - say a word that starts with the last letter of the previous word",
        usage: "!wordchain <word>",
        example: "!wordchain apple",
        category: "Games"
    },
    '!emojiquiz': {
        description: "Play Emoji Quiz - guess what the emoji represents",
        usage: "!emojiquiz",
        example: "!emojiquiz",
        category: "Games"
    },
    '!riddle': {
        description: "Get a random riddle to solve",
        usage: "!riddle",
        example: "!riddle",
        category: "Games"
    },
    '!truthordare': {
        description: "Play Truth or Dare with random questions",
        usage: "!truthordare",
        example: "!truthordare",
        category: "Games"
    },
    '!wouldyourather': {
        description: "Get a random 'Would You Rather' question",
        usage: "!wouldyourather",
        example: "!wouldyourather",
        category: "Games"
    },
    '!neverhaveiever': {
        description: "Get a random 'Never Have I Ever' statement",
        usage: "!neverhaveiever",
        example: "!neverhaveiever",
        category: "Games"
    },
    '!typinggame': {
        description: "Play a typing speed game",
        usage: "!typinggame [text]",
        example: "!typinggame The quick brown fox",
        category: "Games"
    },
    '!addsudo': {
        description: "Add a user to sudo (bot admin) permissions (Owner only)",
        usage: "!addsudo @user",
        example: "!addsudo @1234567890",
        category: "Admin"
    },
    '!removesudo': {
        description: "Remove a user from sudo permissions (Owner only)",
        usage: "!removesudo @user",
        example: "!removesudo @1234567890",
        category: "Admin"
    },
    '!listsudo': {
        description: "List all sudo users (Owner only)",
        usage: "!listsudo",
        example: "!listsudo",
        category: "Admin"
    },
    '!owner': {
        description: "Check if you are the bot owner and show owner info",
        usage: "!owner",
        example: "!owner",
        category: "Admin"
    }
};

// Custom styling for bot responses
const BOT_STYLES = {
    header: "╭─────────────────────────────╮\n",
    footer: "╰─────────────────────────────╯",
    divider: "─────────────────────────────",
    creator: `\n\n💫 *Created by BIG TENNET*\n📱 Instagram: @${CREATOR_INFO.ig}\n🌐 Website: ${CREATOR_INFO.website}`
};

// Helper function to format command help
function formatCommandHelp(command) {
    const doc = COMMAND_DOCS[command];
    if (!doc) return null;
    
    return `${BOT_STYLES.header}📋 *${command.toUpperCase()}*\n${BOT_STYLES.divider}\n\n📝 *Description:*\n${doc.description}\n\n💡 *Usage:*\n\`${doc.usage}\`\n\n🎯 *Example:*\n\`${doc.example}\`\n\n🏷️ *Category:* ${doc.category}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`;
}

// Helper function to format category help
function formatCategoryHelp(category) {
    const commands = Object.entries(COMMAND_DOCS)
        .filter(([cmd, doc]) => doc.category === category)
        .map(([cmd, doc]) => `• \`${cmd}\` - ${doc.description}`)
        .join('\n');
    
    return `${BOT_STYLES.header}📂 *${category.toUpperCase()} COMMANDS*\n${BOT_STYLES.divider}\n\n${commands}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`;
}

// Keep-alive function to prevent disconnections
// Global variables for connection management
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds

function startKeepAlive(sock) {
    console.log('🔄 Starting enhanced keep-alive mechanism...');
    
    // Send a heartbeat every 3 minutes (more frequent)
    const heartbeatInterval = setInterval(async () => {
        try {
            if (sock.user && sock.user.id) {
                // Update status to show bot is active
                await sock.updateProfileStatus('🤖 BIG TENNET Bot - Online');
                console.log('💓 Heartbeat sent - Bot is alive');
            }
        } catch (error) {
            console.log('❌ Heartbeat failed:', error.message);
            // If heartbeat fails, it might indicate connection issues
            checkConnectionHealth(sock);
        }
    }, 3 * 60 * 1000); // 3 minutes
    
    // Send a ping message to yourself every 10 minutes
    const pingInterval = setInterval(async () => {
        try {
            if (sock.user && sock.user.id) {
                const botNumber = sock.user.id.split(':')[0];
                const botJid = `${botNumber}@s.whatsapp.net`;
                
                // Send a hidden message to keep connection active
                await sock.sendMessage(botJid, { 
                    text: '🔄 Keep-alive ping' 
                });
                console.log('📡 Ping sent - Connection maintained');
            }
        } catch (error) {
            console.log('❌ Ping failed:', error.message);
            checkConnectionHealth(sock);
        }
    }, 10 * 60 * 1000); // 10 minutes
    
    // Connection health check every 5 minutes
    const healthCheckInterval = setInterval(() => {
        checkConnectionHealth(sock);
    }, 5 * 60 * 1000); // 5 minutes
    
    // Log keep-alive status every 30 minutes
    const logInterval = setInterval(() => {
        console.log('✅ Keep-alive mechanism running - Bot connection stable');
        console.log(`📊 Uptime: ${getUptime()}`);
    }, 30 * 60 * 1000); // 30 minutes
    
    // Store intervals for cleanup
    sock.keepAliveIntervals = [heartbeatInterval, pingInterval, healthCheckInterval, logInterval];
}

// Check connection health
async function checkConnectionHealth(sock) {
    try {
        if (!sock.user || !sock.user.id) {
            console.log('⚠️ Connection health check failed - No user data');
            return false;
        }
        
        // Try to get user info to test connection
        const userInfo = await sock.user;
        if (userInfo) {
            console.log('✅ Connection health check passed');
            return true;
        }
    } catch (error) {
        console.log('❌ Connection health check failed:', error.message);
        return false;
    }
}

// Get bot uptime
function getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Enhanced reconnection logic
async function reconnectBot() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('❌ Max reconnection attempts reached. Restarting bot...');
        process.exit(1); // Exit and let PM2/process manager restart
    }
    
    reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        startBot();
    }, RECONNECT_DELAY * reconnectAttempts);
}

// Process error handling
process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error);
    console.log('🔄 Restarting bot in 10 seconds...');
    setTimeout(() => {
        process.exit(1);
    }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🔄 Restarting bot in 10 seconds...');
    setTimeout(() => {
        process.exit(1);
    }, 10000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT. Graceful shutdown...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM. Graceful shutdown...');
    process.exit(0);
});

// DB file path
const DB_PATH = path.join(__dirname, 'db.json');

// Initialize db.json if not exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ polls: {}, xp: {}, sudoUsers: [] }, null, 2));
}

// Load sudo users on startup
loadSudoUsers();

function loadDB() {
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Helper to send a reply quoting the original message
async function reply(sock, msg, text) {
    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
}

// Command list
const COMMANDS = [
    '!ping', '!debug', '!help', '!time', '!datediff', '!timein', '!shorten', '!tempmail', '!color', '!password', '!motivate', '!joke', '!quote', '!trivia', '!weather', '!define', '!country', '!coin', '!crypto', '!reverse', '!rps', '!textart', '!poll', '!vote', '!xp', '!rank', '!binary', '!unbinary', '!emoji', '!countdown', '!bible', '!fact', '!wordday', '!tagall', '!list', '!catfact', '!dogfact', '!remind', '!uuid', '!roll', '!palindrome', '!capitalize', '!echo', '!creator', '!kick', '!add', '!promote', '!demote', '!ban', '!unban', '!groupinfo', '!setdesc', '!setname', '!vv', '!viewonce', '!test', '!sticker', '!wordle', '!hangman', '!tictactoe', '!numberguess', '!wordchain', '!emojiquiz', '!riddle', '!truthordare', '!wouldyourather', '!neverhaveiever', '!typinggame', '!addsudo', '!removesudo', '!listsudo', '!owner'
];

// Separate commands by type
const PRIVATE_COMMANDS = [
    '!ping', '!debug', '!help', '!time', '!datediff', '!timein', '!shorten', '!tempmail', '!color', '!password', '!motivate', '!joke', '!quote', '!trivia', '!weather', '!define', '!country', '!coin', '!crypto', '!reverse', '!rps', '!textart', '!poll', '!vote', '!xp', '!rank', '!binary', '!unbinary', '!emoji', '!countdown', '!bible', '!fact', '!wordday', '!list', '!catfact', '!dogfact', '!remind', '!uuid', '!roll', '!palindrome', '!capitalize', '!echo', '!creator', '!vv', '!viewonce', '!test', '!sticker', '!wordle', '!hangman', '!tictactoe', '!numberguess', '!wordchain', '!emojiquiz', '!riddle', '!truthordare', '!wouldyourather', '!neverhaveiever', '!typinggame', '!addsudo', '!removesudo', '!listsudo', '!owner'
];

const GROUP_ONLY_COMMANDS = [
    '!tagall', '!kick', '!add', '!promote', '!demote', '!ban', '!unban', '!groupinfo', '!setdesc', '!setname', '!antispam', '!antilink'
];

// Antispam state (in-memory)
const antispamSettings = {};
const antispamTracker = {};
const SPAM_THRESHOLD = 5;
const SPAM_WINDOW = 10 * 1000; // 10 seconds

// Antilink state (in-memory)
const antilinkSettings = {};
const LINK_PATTERNS = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /t\.me\/[^\s]+/gi,
    /bit\.ly\/[^\s]+/gi,
    /tinyurl\.com\/[^\s]+/gi,
    /youtu\.be\/[^\s]+/gi,
    /youtube\.com\/[^\s]+/gi,
    /instagram\.com\/[^\s]+/gi,
    /facebook\.com\/[^\s]+/gi,
    /twitter\.com\/[^\s]+/gi,
    /x\.com\/[^\s]+/gi,
    /tiktok\.com\/[^\s]+/gi,
    /snapchat\.com\/[^\s]+/gi,
    /discord\.gg\/[^\s]+/gi,
    /discord\.com\/[^\s]+/gi,
    /telegram\.me\/[^\s]+/gi,
    /wa\.me\/[^\s]+/gi,
    /whatsapp\.com\/[^\s]+/gi
];

// Main async function
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Display QR code in terminal properly
            console.log('Scan this QR code with your WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('❌ Connection closed, attempting to reconnect...');
                console.log('🔍 Disconnect reason:', lastDisconnect?.error?.output?.statusCode);
                reconnectBot();
            } else {
                console.log('❌ Connection closed permanently (logged out)');
                console.log('🔄 Restarting bot in 30 seconds...');
                setTimeout(() => {
                    process.exit(1);
                }, 30000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp bot is connected and ready!');
            console.log(`👨‍💻 Created by: ${CREATOR_INFO.name}`);
            console.log(`🌐 Website: ${CREATOR_INFO.website}`);
            console.log(`📊 Bot started at: ${new Date().toLocaleString()}`);
            
            // Reset reconnection attempts on successful connection
            reconnectAttempts = 0;
            
            // Start keep-alive mechanism
            startKeepAlive(sock);
        } else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`📨 Messages.upsert event: type=${type}, messages count=${messages.length}`);
        
        if (type !== 'notify') {
            console.log(`❌ Skipping non-notify message type: ${type}`);
            return;
        }
        
        for (const msg of messages) {
            console.log(`📨 Processing message from ${msg.key.remoteJid}`);
            console.log(`📨 Message key:`, JSON.stringify(msg.key, null, 2));
            console.log(`📨 Message content:`, JSON.stringify(msg.message, null, 2));
            
            if (!msg.message) {
                console.log('❌ No message content');
                continue;
            }
            
            // Debug: Show bot's own number
            const botNumber = sock.user?.id?.split(':')[0];
            console.log(`🤖 Bot number: ${botNumber}`);
            console.log(`📱 Message from: ${msg.key.remoteJid}`);
            console.log(`👤 FromMe: ${msg.key.fromMe}`);
            
            // Only skip own messages in groups, not in private chats
            const isGroup = msg.key.remoteJid.endsWith('@g.us');
            if (msg.key.fromMe && isGroup) {
                console.log('❌ Skipping own message in group');
                continue;
            }
            
            // Skip if the message is from the bot's own number (only for groups)
            if (isGroup && msg.key.remoteJid === `${botNumber}@s.whatsapp.net`) {
                console.log('❌ Skipping message from bot\'s own number in group');
                continue;
            }
            
            // Skip status@broadcast messages
            if (msg.key.remoteJid === 'status@broadcast') {
                console.log('❌ Skipping status broadcast message');
                continue;
            }
            
            // Skip system messages and protocol messages
            const messageTypes = Object.keys(msg.message || {});
            const systemMessageTypes = ['senderKeyDistributionMessage', 'protocolMessage'];
            const isSystemMessage = systemMessageTypes.some(type => messageTypes.includes(type));
            
            if (isSystemMessage) {
                console.log('❌ Skipping system/protocol message:', messageTypes);
                continue;
            }
            
            const chatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
            console.log(`📨 Processing message from ${msg.key.remoteJid} (${chatType})`);
            console.log(`🔍 Message types found:`, Object.keys(msg.message || {}));
            
            // Handle view-once media automatically
            await handleViewOnceAuto(sock, msg);
            
            // Handle regular commands
            await handleMessage(sock, msg);
        }
    });
}

// --- Game Handlers ---

// Wordle Game
async function handleWordle(sock, msg, guess) {
    const words = ['HELLO', 'WORLD', 'GAMES', 'FUNNY', 'HAPPY', 'SMILE', 'DANCE', 'MUSIC', 'SPORT', 'BOOKS', 'MOVIE', 'STARS', 'OCEAN', 'MOUNTAIN', 'FRIEND', 'FAMILY', 'LOVE', 'PEACE', 'DREAM', 'HOPE'];
    const targetWord = words[Math.floor(Math.random() * words.length)];
    
    if (!guess) {
        return await reply(sock, msg, `🎯 *WORDLE GAME* 🎯\n\n📝 *How to play:*\n• Type !wordle <5-letter word>\n• Green 🟢 = correct letter, correct position\n• Yellow 🟡 = correct letter, wrong position\n• Gray ⚫ = letter not in word\n\n💡 *Example:* !wordle HELLO\n\n🎮 *Ready to play?* Guess a 5-letter word!`);
    }
    
    guess = guess.toUpperCase();
    if (guess.length !== 5) {
        return await reply(sock, msg, '❌ Please enter a 5-letter word!');
    }
    
    if (!/^[A-Z]{5}$/.test(guess)) {
        return await reply(sock, msg, '❌ Please enter only letters!');
    }
    
    let result = '';
    let correct = 0;
    
    for (let i = 0; i < 5; i++) {
        if (guess[i] === targetWord[i]) {
            result += '🟢';
            correct++;
        } else if (targetWord.includes(guess[i])) {
            result += '🟡';
        } else {
            result += '⚫';
        }
    }
    
    if (correct === 5) {
        await reply(sock, msg, `🎉 *CONGRATULATIONS!* 🎉\n\n🎯 You guessed it: *${targetWord}*\n${result}\n\n🏆 *Perfect score!*`);
    } else {
        await reply(sock, msg, `📝 *Wordle Result*\n\n🎯 Your guess: *${guess}*\n🎯 Target: *${targetWord}*\n${result}\n\n💡 Keep trying!`);
    }
}

// Hangman Game
async function handleHangman(sock, msg, guess) {
    const words = ['PYTHON', 'JAVASCRIPT', 'PROGRAMMING', 'COMPUTER', 'ALGORITHM', 'DATABASE', 'NETWORK', 'SECURITY', 'SOFTWARE', 'HARDWARE'];
    const targetWord = words[Math.floor(Math.random() * words.length)];
    const maxAttempts = 6;
    let attempts = 0;
    let guessed = new Set();
    let display = targetWord.split('').map(() => '_').join(' ');
    
    if (!guess) {
        return await reply(sock, msg, `🎯 *HANGMAN GAME* 🎯\n\n📝 *How to play:*\n• Type !hangman <letter>\n• Guess letters to reveal the word\n• You have 6 attempts\n• The word is: ${display}\n\n💡 *Example:* !hangman A\n\n🎮 *Ready to play?* Guess a letter!`);
    }
    
    guess = guess.toUpperCase();
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        return await reply(sock, msg, '❌ Please enter a single letter!');
    }
    
    if (guessed.has(guess)) {
        return await reply(sock, msg, '❌ You already guessed that letter!');
    }
    
    guessed.add(guess);
    
    if (targetWord.includes(guess)) {
        display = targetWord.split('').map(letter => guessed.has(letter) ? letter : '_').join(' ');
        if (!display.includes('_')) {
            await reply(sock, msg, `🎉 *CONGRATULATIONS!* 🎉\n\n🎯 You won! The word was: *${targetWord}*\n${display}\n\n🏆 *Great job!*`);
        } else {
            await reply(sock, msg, `✅ *Correct!*\n\n🎯 Word: ${display}\n📝 Guessed: ${Array.from(guessed).join(', ')}\n💀 Attempts left: ${maxAttempts - attempts}`);
        }
    } else {
        attempts++;
        if (attempts >= maxAttempts) {
            await reply(sock, msg, `💀 *GAME OVER!* 💀\n\n🎯 The word was: *${targetWord}*\n📝 Guessed: ${Array.from(guessed).join(', ')}\n\n😔 Better luck next time!`);
        } else {
            await reply(sock, msg, `❌ *Wrong guess!*\n\n🎯 Word: ${display}\n📝 Guessed: ${Array.from(guessed).join(', ')}\n💀 Attempts left: ${maxAttempts - attempts}`);
        }
    }
}

// Tic Tac Toe Game
async function handleTicTacToe(sock, msg, move) {
    if (!move) {
        return await reply(sock, msg, `🎮 *TIC TAC TOE* 🎮\n\n📝 *How to play:*\n• Type !tictactoe <position>\n• Positions: 1-9 (top-left to bottom-right)\n\n📋 *Board Layout:*\n1 | 2 | 3\n---------\n4 | 5 | 6\n---------\n7 | 8 | 9\n\n💡 *Example:* !tictactoe 5\n\n🎮 *Ready to play?* Choose a position!`);
    }
    
    const position = parseInt(move);
    if (isNaN(position) || position < 1 || position > 9) {
        return await reply(sock, msg, '❌ Please enter a number between 1-9!');
    }
    
    // Simple AI response
    const aiMove = Math.floor(Math.random() * 9) + 1;
    const result = Math.random() > 0.5 ? 'You win!' : 'AI wins!';
    
    await reply(sock, msg, `🎮 *Tic Tac Toe Move*\n\n👤 Your move: Position ${position}\n🤖 AI move: Position ${aiMove}\n\n🏆 *Result:* ${result}\n\n🎮 Play again with !tictactoe <position>`);
}

// Number Guessing Game
async function handleNumberGuess(sock, msg, guess) {
    const targetNumber = Math.floor(Math.random() * 100) + 1;
    
    if (!guess) {
        return await reply(sock, msg, `🎯 *NUMBER GUESSING GAME* 🎯\n\n📝 *How to play:*\n• Type !numberguess <number>\n• Guess a number between 1-100\n• I'll tell you if it's higher or lower\n\n💡 *Example:* !numberguess 50\n\n🎮 *Ready to play?* Guess a number!`);
    }
    
    const userGuess = parseInt(guess);
    if (isNaN(userGuess) || userGuess < 1 || userGuess > 100) {
        return await reply(sock, msg, '❌ Please enter a number between 1-100!');
    }
    
    if (userGuess === targetNumber) {
        await reply(sock, msg, `🎉 *CONGRATULATIONS!* 🎉\n\n🎯 You guessed it: *${targetNumber}*\n\n🏆 *Perfect guess!*`);
    } else if (userGuess < targetNumber) {
        await reply(sock, msg, `📈 *Higher!*\n\n🎯 Your guess: ${userGuess}\n💡 The number is higher than ${userGuess}\n\n🎮 Try again with !numberguess <number>`);
    } else {
        await reply(sock, msg, `📉 *Lower!*\n\n🎯 Your guess: ${userGuess}\n💡 The number is lower than ${userGuess}\n\n🎮 Try again with !numberguess <number>`);
    }
}

// Word Chain Game
async function handleWordChain(sock, msg, word) {
    if (!word) {
        return await reply(sock, msg, `🔗 *WORD CHAIN GAME* 🔗\n\n📝 *How to play:*\n• Type !wordchain <word>\n• I'll give you a word that starts with the last letter of your word\n• Keep the chain going!\n\n💡 *Example:* !wordchain HELLO\n\n🎮 *Ready to play?* Start with any word!`);
    }
    
    const lastLetter = word.slice(-1).toUpperCase();
    const responses = {
        'A': ['APPLE', 'ADVENTURE', 'AMAZING', 'ASTRONAUT'],
        'B': ['BEAUTIFUL', 'BRAVE', 'BRILLIANT', 'BUTTERFLY'],
        'C': ['CREATIVE', 'CLEVER', 'COLORFUL', 'CHALLENGE'],
        'D': ['DREAM', 'DANGEROUS', 'DELICIOUS', 'DETERMINED'],
        'E': ['EXCITING', 'ENERGETIC', 'EXCELLENT', 'ELEPHANT'],
        'F': ['FANTASTIC', 'FRIENDLY', 'FUNNY', 'FREEDOM'],
        'G': ['GREAT', 'GENEROUS', 'GENTLE', 'GARDEN'],
        'H': ['HAPPY', 'HELPFUL', 'HONEST', 'HARMONY'],
        'I': ['IMAGINATIVE', 'INTELLIGENT', 'INTERESTING', 'INSPIRING'],
        'J': ['JOYFUL', 'JUSTICE', 'JOURNEY', 'JEWEL'],
        'K': ['KIND', 'KNOWLEDGE', 'KINDNESS', 'KINGDOM'],
        'L': ['LOVE', 'LUCKY', 'LIGHT', 'LIFE'],
        'M': ['MAGICAL', 'MUSIC', 'MIRACLE', 'MOMENT'],
        'N': ['NICE', 'NATURE', 'NIGHT', 'NEW'],
        'O': ['OUTSTANDING', 'OPPORTUNITY', 'OCEAN', 'OPEN'],
        'P': ['PERFECT', 'PEACE', 'POWER', 'PASSION'],
        'Q': ['QUICK', 'QUIET', 'QUALITY', 'QUEST'],
        'R': ['REMARKABLE', 'RADIO', 'RIVER', 'RAINBOW'],
        'S': ['SPECIAL', 'SUNSHINE', 'SUCCESS', 'STAR'],
        'T': ['TERRIFIC', 'TREASURE', 'TRAVEL', 'TIME'],
        'U': ['UNIQUE', 'UNITED', 'USEFUL', 'UNDERSTAND'],
        'V': ['VICTORY', 'VALUABLE', 'VIBRANT', 'VISION'],
        'W': ['WONDERFUL', 'WISDOM', 'WARM', 'WIND'],
        'X': ['XENIAL', 'XEROX', 'XENON', 'XENOPHOBIC'],
        'Y': ['YOUNG', 'YELLOW', 'YOUTH', 'YEAR'],
        'Z': ['ZEST', 'ZEN', 'ZEBRA', 'ZERO']
    };
    
    const possibleWords = responses[lastLetter] || ['AWESOME', 'BRILLIANT', 'COOL', 'DOPE'];
    const response = possibleWords[Math.floor(Math.random() * possibleWords.length)];
    
    await reply(sock, msg, `🔗 *Word Chain*\n\n📝 Your word: *${word.toUpperCase()}*\n🔤 Last letter: *${lastLetter}*\n🎯 My word: *${response}*\n\n💡 Continue with: !wordchain ${response}`);
}

// Emoji Quiz Game
async function handleEmojiQuiz(sock, msg) {
    const quizzes = [
        { emoji: '🍕🍕🍕', answer: 'PIZZA' },
        { emoji: '🌍🌍🌍', answer: 'EARTH' },
        { emoji: '🎬🎬🎬', answer: 'MOVIE' },
        { emoji: '🎵🎵🎵', answer: 'MUSIC' },
        { emoji: '⚽⚽⚽', answer: 'FOOTBALL' },
        { emoji: '🏠🏠🏠', answer: 'HOME' },
        { emoji: '🚗🚗🚗', answer: 'CAR' },
        { emoji: '🐱🐱🐱', answer: 'CAT' },
        { emoji: '🌺🌺🌺', answer: 'FLOWER' },
        { emoji: '⭐⭐⭐', answer: 'STAR' },
        { emoji: '🌈🌈🌈', answer: 'RAINBOW' },
        { emoji: '🎂🎂🎂', answer: 'BIRTHDAY' },
        { emoji: '💻💻💻', answer: 'COMPUTER' },
        { emoji: '📱📱📱', answer: 'PHONE' },
        { emoji: '🎮🎮🎮', answer: 'GAME' }
    ];
    
    const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
    
    await reply(sock, msg, `🎯 *EMOJI QUIZ* 🎯\n\n🤔 *Guess the word:*\n${quiz.emoji}\n\n💡 *Hint:* It's a common word\n🎮 *Answer:* ${quiz.answer}\n\n🎯 *How to play:* Just type !emojiquiz for a new quiz!`);
}

// Riddle Game
async function handleRiddle(sock, msg) {
    const riddles = [
        { question: "What has keys, but no locks; space, but no room; and you can enter, but not go in?", answer: "KEYBOARD" },
        { question: "What gets wetter and wetter the more it dries?", answer: "TOWEL" },
        { question: "What has a head and a tail but no body?", answer: "COIN" },
        { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "LETTER M" },
        { question: "What has cities, but no houses; forests, but no trees; and rivers, but no water?", answer: "MAP" },
        { question: "What is always in front of you but can't be seen?", answer: "FUTURE" },
        { question: "What breaks when you say it?", answer: "SILENCE" },
        { question: "What has legs, but doesn't walk?", answer: "TABLE" },
        { question: "What has one eye, but can't see?", answer: "NEEDLE" },
        { question: "What can travel around the world while sitting in a corner?", answer: "STAMP" }
    ];
    
    const riddle = riddles[Math.floor(Math.random() * riddles.length)];
    
    await reply(sock, msg, `🧩 *RIDDLE TIME* 🧩\n\n🤔 *Riddle:*\n${riddle.question}\n\n💡 *Answer:* ${riddle.answer}\n\n🎯 *How to play:* Type !riddle for a new riddle!`);
}

// Truth or Dare Game
async function handleTruthOrDare(sock, msg) {
    const truths = [
        "What's your biggest fear?",
        "What's the most embarrassing thing that happened to you?",
        "What's your biggest regret?",
        "What's your biggest dream?",
        "What's your biggest secret?",
        "What's your biggest weakness?",
        "What's your biggest strength?",
        "What's your biggest achievement?",
        "What's your biggest failure?",
        "What's your biggest goal?"
    ];
    
    const dares = [
        "Send a voice message singing your favorite song",
        "Send a selfie with a funny face",
        "Send a message in a different language",
        "Send a message using only emojis",
        "Send a message backwards",
        "Send a message in all caps",
        "Send a message in all lowercase",
        "Send a message with numbers instead of letters",
        "Send a message with only vowels",
        "Send a message with only consonants"
    ];
    
    const choice = Math.random() > 0.5 ? 'TRUTH' : 'DARE';
    const question = choice === 'TRUTH' 
        ? truths[Math.floor(Math.random() * truths.length)]
        : dares[Math.floor(Math.random() * dares.length)];
    
    await reply(sock, msg, `🎭 *TRUTH OR DARE* 🎭\n\n🎯 *Your choice:* ${choice}\n\n💬 *${choice}:*\n${question}\n\n🎮 *How to play:* Type !truthordare for a new challenge!`);
}

// Would You Rather Game
async function handleWouldYouRather(sock, msg) {
    const questions = [
        "Would you rather be invisible or be able to fly?",
        "Would you rather be rich and ugly or poor and beautiful?",
        "Would you rather be smart and lonely or stupid and popular?",
        "Would you rather be famous for something bad or unknown for something good?",
        "Would you rather be poor and happy or rich and sad?",
        "Would you rather be able to read minds or see the future?",
        "Would you rather be able to speak all languages or play all instruments?",
        "Would you rather be able to teleport or time travel?",
        "Would you rather be a superhero or a villain?",
        "Would you rather be a cat or a dog?",
        "Would you rather live in the past or the future?",
        "Would you rather be too hot or too cold?",
        "Would you rather be too tall or too short?",
        "Would you rather be too loud or too quiet?",
        "Would you rather be too fast or too slow?"
    ];
    
    const question = questions[Math.floor(Math.random() * questions.length)];
    
    await reply(sock, msg, `🤔 *WOULD YOU RATHER* 🤔\n\n💭 *Question:*\n${question}\n\n💡 *Think about it and share your answer!*\n\n🎮 *How to play:* Type !wouldyourather for a new question!`);
}

// Never Have I Ever Game
async function handleNeverHaveIEver(sock, msg) {
    const statements = [
        "Never have I ever lied to get out of trouble",
        "Never have I ever eaten something that fell on the floor",
        "Never have I ever pretended to be sick to skip work/school",
        "Never have I ever danced in public",
        "Never have I ever sung in the shower",
        "Never have I ever talked to myself",
        "Never have I ever laughed so hard I cried",
        "Never have I ever been late to an important meeting",
        "Never have I ever forgotten someone's name",
        "Never have I ever been embarrassed in public",
        "Never have I ever been scared of the dark",
        "Never have I ever been afraid of heights",
        "Never have I ever been nervous about speaking in public",
        "Never have I ever been excited about a new movie",
        "Never have I ever been sad about a book ending"
    ];
    
    const statement = statements[Math.floor(Math.random() * statements.length)];
    
    await reply(sock, msg, `🙈 *NEVER HAVE I EVER* 🙈\n\n💭 *Statement:*\n${statement}\n\n💡 *If you HAVE done this, type 'I have' or 'Me'*\n💡 *If you HAVEN'T done this, type 'I haven't' or 'Not me'*\n\n🎮 *How to play:* Type !neverhaveiever for a new statement!`);
}

// Typing Game
async function handleTypingGame(sock, msg, userInput) {
    const sentences = [
        "The quick brown fox jumps over the lazy dog.",
        "All work and no play makes Jack a dull boy.",
        "To be or not to be, that is the question.",
        "A journey of a thousand miles begins with a single step.",
        "Practice makes perfect.",
        "Actions speak louder than words.",
        "Better late than never.",
        "Don't judge a book by its cover.",
        "Every cloud has a silver lining.",
        "Fortune favors the bold.",
        "Good things come to those who wait.",
        "Honesty is the best policy.",
        "If at first you don't succeed, try try again.",
        "Knowledge is power.",
        "Life is what happens when you're busy making other plans.",
        "Money can't buy happiness.",
        "No pain, no gain.",
        "Opportunity knocks but once.",
        "Practice what you preach.",
        "Quality over quantity.",
        "Rome wasn't built in a day.",
        "Slow and steady wins the race.",
        "The early bird catches the worm.",
        "United we stand, divided we fall.",
        "When in Rome, do as the Romans do.",
        "You can't teach an old dog new tricks.",
        "A picture is worth a thousand words.",
        "Beauty is in the eye of the beholder.",
        "Curiosity killed the cat.",
        "Don't put all your eggs in one basket."
    ];
    
    if (!userInput) {
        const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
        return await reply(sock, msg, `⌨️ *TYPING GAME* ⌨️\n\n📝 *Type this sentence exactly:*\n"${randomSentence}"\n\n💡 *How to play:*\n• Copy the sentence exactly as shown\n• Type: !typinggame <your typed text>\n• I'll check your accuracy and speed\n\n🎯 *Ready to test your typing skills?*`);
    }
    
    // Find the target sentence (we'll use a simple approach)
    const targetSentence = sentences[Math.floor(Math.random() * sentences.length)];
    
    // Calculate accuracy
    const maxLength = Math.max(targetSentence.length, userInput.length);
    let correctChars = 0;
    let errors = 0;
    
    for (let i = 0; i < Math.min(targetSentence.length, userInput.length); i++) {
        if (targetSentence[i] === userInput[i]) {
            correctChars++;
        } else {
            errors++;
        }
    }
    
    // Add errors for length differences
    errors += Math.abs(targetSentence.length - userInput.length);
    
    const accuracy = Math.round((correctChars / maxLength) * 100);
    const wpm = Math.round((userInput.length / 5) * 12); // Rough WPM calculation
    
    let feedback = '';
    if (accuracy >= 95) {
        feedback = '🏆 *Excellent typing!*';
    } else if (accuracy >= 85) {
        feedback = '👍 *Good job!*';
    } else if (accuracy >= 70) {
        feedback = '😊 *Not bad!*';
    } else {
        feedback = '💪 *Keep practicing!*';
    }
    
    await reply(sock, msg, `⌨️ *Typing Test Results* ⌨️\n\n📝 *Target:* "${targetSentence}"\n📝 *Your input:* "${userInput}"\n\n📊 *Results:*\n• Accuracy: ${accuracy}%\n• Errors: ${errors}\n• Speed: ~${wpm} WPM\n\n${feedback}\n\n🎮 *Play again:* Type !typinggame for a new sentence!`);
}

// Automatic View-Once Handler
async function handleViewOnceAuto(sock, msg) {
    try {
        // Check if this is a view-once message
        const isViewOnce = !!msg.message?.viewOnceMessageV2;
        
        if (!isViewOnce) return;

        // Get the media type and original message
        const viewOnceContent = msg.message.viewOnceMessageV2.message;
        const mediaType = Object.keys(viewOnceContent)[0];
        const originalMessage = viewOnceContent[mediaType];

        if (!mediaType || !originalMessage) return;

        const chatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
        const sender = msg.key.participant || msg.key.remoteJid;
        console.log(`🔍 Detected view-once ${mediaType} from ${sender} (${chatType} chat)`);

        // Download the media using the correct method
        let buffer = null;
        
        try {
            // Use the correct downloadContentFromMessage method
            const stream = await downloadContentFromMessage(originalMessage, mediaType.replace('Message', ''));
            
            buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            console.log(`✅ Downloaded view-once ${mediaType}, size: ${buffer.length} bytes`);
        } catch (e) {
            console.log('Failed to download view-once media:', e.message);
        }

        if (!buffer || buffer.length === 0) {
            console.log('❌ Failed to download view-once media');
            return;
        }

        // Convert media type for sending (remove 'Message' suffix)
        const sendType = mediaType.replace('Message', '');
        
        // Create caption
        const caption = `🔓 *View-once ${sendType} unlocked*\n\n💡 *BIG TENNET Bot* made this ${sendType} viewable multiple times!`;

        // Send the media back
        await sock.sendMessage(msg.key.remoteJid, {
            [sendType]: buffer,
            caption: caption
        }, { quoted: msg });

        console.log(`✅ View-once ${sendType} sent back to chat`);

    } catch (error) {
        console.error('View-once auto handler error:', error);
    }
}

// Main message handler
async function handleMessage(sock, msg) {
    try {
        const m = msg.message;
        let text = '';
        
        console.log('🔍 Checking message types:', Object.keys(m));
        console.log('🔍 Full message structure:', JSON.stringify(m, null, 2));
        
        if (m.conversation) {
            text = m.conversation;
            console.log('✅ Found conversation text:', text);
        } else if (m.extendedTextMessage) {
            text = m.extendedTextMessage.text;
            console.log('✅ Found extended text:', text);
        } else if (m.imageMessage && m.imageMessage.caption) {
            text = m.imageMessage.caption;
            console.log('✅ Found image caption:', text);
        } else if (m.videoMessage && m.videoMessage.caption) {
            text = m.videoMessage.caption;
            console.log('✅ Found video caption:', text);
        } else {
            console.log('❌ No text content found in message');
            console.log('🔍 Message structure:', JSON.stringify(m, null, 2));
            return;
        }
        
        console.log(`💬 Text content: "${text}"`);
        
        if (!text.startsWith('!')) {
            console.log('❌ Message does not start with !');
            return;
        }
        const [cmd, ...args] = text.trim().split(/\s+/);
        const argstr = args.join(' ');
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        
        console.log(`🔧 Processing command: ${cmd} in ${isGroup ? 'Group' : 'Private'} chat`);
        
        // Check if user can use the bot (bot owner or sudo user)
        const userId = msg.key.participant || msg.key.remoteJid;
        if (!canUseBot(userId)) {
            console.log(`❌ User ${userId} not authorized to use bot`);
            await reply(sock, msg, `${BOT_STYLES.header}🔒 *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n❌ You are not authorized to use this bot.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}\n🌐 Website: ${CREATOR_INFO.website}\n\n🔐 *Only authorized users can use this bot*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
            return;
        }
        
        console.log(`✅ User ${userId} authorized to use bot`);
        
        // Add a simple test response for any command
        if (cmd.toLowerCase() === '!ping') {
            console.log('🏓 PING command detected!');
            await reply(sock, msg, '⚡ pong!');
            return;
        }
        
        // Add a simple debug command
        if (cmd.toLowerCase() === '!debug') {
            console.log('🐛 DEBUG command detected!');
            const debugInfo = `🐛 *Debug Info*\n\n📱 *Chat Type:* ${isGroup ? 'Group' : 'Private'}\n👤 *From:* ${msg.key.remoteJid}\n💬 *Command:* ${cmd}\n🔧 *Args:* ${args.join(', ')}\n⏰ *Time:* ${new Date().toISOString()}`;
            await reply(sock, msg, debugInfo);
            return;
        }
        
        // Antispam check (only if enabled and in group)
        if (isGroup && antispamSettings[msg.key.remoteJid]) {
            const user = msg.key.participant || msg.key.remoteJid;
            if (!antispamTracker[msg.key.remoteJid]) antispamTracker[msg.key.remoteJid] = {};
            if (!antispamTracker[msg.key.remoteJid][user]) antispamTracker[msg.key.remoteJid][user] = [];
            const now = Date.now();
            antispamTracker[msg.key.remoteJid][user] = antispamTracker[msg.key.remoteJid][user].filter(ts => now - ts < SPAM_WINDOW);
            antispamTracker[msg.key.remoteJid][user].push(now);
            if (antispamTracker[msg.key.remoteJid][user].length > SPAM_THRESHOLD) {
                try {
                    // Remove the user from the group
                    await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], "remove");
                    await reply(sock, msg, `🚨 *Anti-Spam Action!* 🚨\n\n👤 User <@${user.split('@')[0]}> has been *REMOVED* from the group for spamming.\n\n⚠️ *Reason:* Sending too many messages too quickly\n\n🛡️ *Protection:* Antispam system activated`);
                } catch (kickError) {
                    console.error('Failed to remove spammer:', kickError);
                    await reply(sock, msg, `🚨 *Anti-Spam Alert!* 🚨\nHey <@${user.split('@')[0]}>! Please slow down, you are sending messages too quickly. Let's keep the chat friendly!`);
                }
                // Clear their tracker
                antispamTracker[msg.key.remoteJid][user] = [];
                return;
            }
        }

        // Antilink check (only if enabled and in group)
        if (isGroup && antilinkSettings[msg.key.remoteJid]) {
            const user = msg.key.participant || msg.key.remoteJid;
            const hasLink = LINK_PATTERNS.some(pattern => pattern.test(text));
            
            if (hasLink) {
                try {
                    // Remove the user from the group
                    await sock.groupParticipantsUpdate(msg.key.remoteJid, [user], "remove");
                    await reply(sock, msg, `🚫 *Anti-Link Action!* 🚫\n\n👤 User <@${user.split('@')[0]}> has been *REMOVED* from the group for sharing links.\n\n⚠️ *Reason:* Links are not allowed in this group\n\n🛡️ *Protection:* Antilink system activated\n\n💡 *Note:* Admins can use !antilink off to disable this feature`);
                } catch (kickError) {
                    console.error('Failed to remove link sharer:', kickError);
                    await reply(sock, msg, `🚫 *Anti-Link Warning!* 🚫\n\n👤 Hey <@${user.split('@')[0]}>! Links are not allowed in this group.\n\n⚠️ *Next violation will result in removal.*`);
                }
                return;
            }
        }
        
        console.log(`🎯 About to process command: ${cmd.toLowerCase()}`);
        
        switch (cmd.toLowerCase()) {
            case '!ping':
                console.log('🏓 PING case triggered!');
                await reply(sock, msg, `${BOT_STYLES.header}🏓 *PING PONG*\n${BOT_STYLES.divider}\n\n⚡ *Status:* Online & Responsive\n🕒 *Response Time:* Instant\n🔧 *Bot Status:* Working Perfectly\n\n💫 *Server:* BIG TENNET Bot Server${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!debug':
                console.log('🐛 DEBUG case triggered!');
                const debugInfo = `${BOT_STYLES.header}🐛 *DEBUG INFORMATION*\n${BOT_STYLES.divider}\n\n📱 *Chat Type:* ${isGroup ? 'Group' : 'Private'}\n👤 *From:* ${msg.key.remoteJid}\n💬 *Command:* ${cmd}\n🔧 *Args:* ${args.join(', ')}\n⏰ *Time:* ${new Date().toISOString()}\n\n🎨 *Sticker Status:* Ready\n🔓 *View-Once Status:* Ready\n🛡️ *Anti-Spam:* Active\n🚫 *Anti-Link:* Active${BOT_STYLES.creator}\n${BOT_STYLES.footer}`;
                await reply(sock, msg, debugInfo);
                break;
            case '!help':
                const currentChatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
                if (args[0]) {
                    // Help for specific command
                    const commandHelp = formatCommandHelp(args[0]);
                    if (commandHelp) {
                        await reply(sock, msg, commandHelp);
                    } else {
                        await reply(sock, msg, `${BOT_STYLES.header}❌ *COMMAND NOT FOUND*\n${BOT_STYLES.divider}\n\nThe command \`${args[0]}\` was not found.\n\n💡 Type \`!list\` to see all available commands.\n💡 Type \`!help\` for general help.${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                    }
                } else {
                    // General help
                    const categories = [...new Set(Object.values(COMMAND_DOCS).map(doc => doc.category))];
                    const categoryList = categories.map(cat => `• \`${cat}\` - ${Object.values(COMMAND_DOCS).filter(doc => doc.category === cat).length} commands`).join('\n');
                    
                    await reply(sock, msg, `${BOT_STYLES.header}🤖 *BIG TENNET WHATSAPP BOT*\n${BOT_STYLES.divider}\n\n📱 *Current Chat:* ${currentChatType}\n📋 Type \`!list\` to see all available commands\n💡 For help on a command, type \`!help <command>\`\n\n🔓 *View-Once Feature*: The bot automatically unlocks view-once media!\n🎨 *Sticker Feature*: Reply to any image/video with \`!sticker\`\n🎮 *Games*: Try \`!wordle\`, \`!typinggame\`, \`!hangman\`, and more!\n🛡️ *Group Protection*: Use \`!antispam\` and \`!antilink\`\n\n📂 *Command Categories:*\n${categoryList}\n\n✅ *All commands work in private chats*\n🔧 *Group commands only work in groups*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                }
                break;
            case '!creator':
                await reply(sock, msg, `${BOT_STYLES.header}🤖 *${CREATOR_INFO.name} WHATSAPP BOT*\n${BOT_STYLES.divider}\n\n👨‍💻 *Creator:* BIG TENNET\n📱 *Instagram:* @${CREATOR_INFO.ig}\n🎵 *TikTok:* @${CREATOR_INFO.tiktok}\n🌐 *Website:* ${CREATOR_INFO.website}\n\n💫 *Features:*\n• 50+ Commands\n• View-Once Unlocking\n• Sticker Creation\n• Multiplayer Games\n• Group Management\n• Anti-Spam Protection\n\n🔥 *Made with ❤️ by BIG TENNET*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!time':
                await reply(sock, msg, `${BOT_STYLES.header}🕒 *CURRENT TIME*\n${BOT_STYLES.divider}\n\n⏰ *Server Time:* ${new Date().toLocaleString()}\n🌍 *Timezone:* Server Local Time\n📅 *Date:* ${new Date().toDateString()}\n\n💫 *Time Format:* DD/MM/YYYY HH:MM:SS${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!datediff':
                await handleDateDiff(sock, msg, args[0], args[1]);
                break;
            case '!timein':
                await handleTimeIn(sock, msg, argstr);
                break;
            case '!shorten':
                await handleShorten(sock, msg, argstr);
                break;
            case '!tempmail':
                await handleTempMail(sock, msg);
                break;
            case '!color':
                await handleColor(sock, msg, argstr);
                break;
            case '!password':
                await handlePassword(sock, msg, args[0]);
                break;
            case '!motivate':
                await handleMotivate(sock, msg);
                break;
            case '!joke':
                await handleJoke(sock, msg);
                break;
            case '!quote':
                await handleQuote(sock, msg);
                break;
            case '!trivia':
                await handleTrivia(sock, msg);
                break;
            case '!weather':
                await handleWeather(sock, msg, argstr);
                break;
            case '!country':
                await handleCountry(sock, msg, argstr);
                break;
            case '!coin':
                const coinResult = Math.random() < 0.5 ? 'Heads' : 'Tails';
                const coinEmoji = coinResult === 'Heads' ? '🪙' : '🪙';
                await reply(sock, msg, `${BOT_STYLES.header}🪙 *COIN FLIP*\n${BOT_STYLES.divider}\n\n${coinEmoji} *Result:* ${coinResult.toUpperCase()}\n🎲 *Random:* Fair & Unbiased\n\n💫 *Flip again with:* \`!coin\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!crypto':
                await handleCrypto(sock, msg, argstr);
                break;
            case '!reverse':
                if (!argstr) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!reverse <text>\`\n🎯 *Example:* \`!reverse Hello World\`\n\n💫 *This command reverses any text you provide*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                const reversedText = argstr.split('').reverse().join('');
                await reply(sock, msg, `${BOT_STYLES.header}🔄 *TEXT REVERSER*\n${BOT_STYLES.divider}\n\n📝 *Original:* ${argstr}\n🔄 *Reversed:* ${reversedText}\n\n💫 *Reverse anything with:* \`!reverse <text>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!rps':
                await handleRPS(sock, msg, args[0]);
                break;
            case '!textart':
                await handleTextArt(sock, msg, argstr);
                break;
            case '!poll':
                await handlePoll(sock, msg, argstr);
                break;
            case '!vote':
                await handleVote(sock, msg, args[0]);
                break;
            case '!xp':
                await handleXP(sock, msg);
                break;
            case '!rank':
                await handleRank(sock, msg);
                break;
            case '!define':
                await handleDefine(sock, msg, argstr);
                break;
            case '!binary':
                await handleBinary(sock, msg, argstr);
                break;
            case '!unbinary':
                await handleUnbinary(sock, msg, argstr);
                break;
            case '!emoji':
                await handleEmoji(sock, msg, argstr);
                break;
            case '!countdown':
                await handleCountdown(sock, msg, args[0]);
                break;
            case '!bible':
                await handleBible(sock, msg);
                break;
            case '!fact':
                await handleFact(sock, msg);
                break;
            case '!wordday':
                await handleWordDay(sock, msg);
                break;
            case '!list':
                const listChatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
                if (args[0]) {
                    // List commands by category
                    const category = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
                    const categoryHelp = formatCategoryHelp(category);
                    if (categoryHelp) {
                        await reply(sock, msg, categoryHelp);
                    } else {
                        await reply(sock, msg, `${BOT_STYLES.header}❌ *CATEGORY NOT FOUND*\n${BOT_STYLES.divider}\n\nThe category \`${args[0]}\` was not found.\n\n💡 Available categories:\n${[...new Set(Object.values(COMMAND_DOCS).map(doc => doc.category))].map(cat => `• \`${cat}\``).join('\n')}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                    }
                } else {
                    // List all commands with categories
                    const categories = [...new Set(Object.values(COMMAND_DOCS).map(doc => doc.category))];
                    let commandList = `${BOT_STYLES.header}📋 *AVAILABLE COMMANDS* (${listChatType} Chat)\n${BOT_STYLES.divider}\n\n`;
                    
                    categories.forEach(category => {
                        const categoryCommands = Object.entries(COMMAND_DOCS)
                            .filter(([cmd, doc]) => doc.category === category)
                            .map(([cmd, doc]) => `• \`${cmd}\` - ${doc.description}`)
                            .join('\n');
                        
                        commandList += `📂 *${category.toUpperCase()}*\n${categoryCommands}\n\n`;
                    });
                    
                    commandList += `💡 *Usage Tips:*\n• Type \`!help <command>\` for detailed help\n• Type \`!list <category>\` to see commands by category\n• Group commands only work in groups${BOT_STYLES.creator}\n${BOT_STYLES.footer}`;
                    
                    await reply(sock, msg, commandList);
                }
                break;
            case '!catfact':
                await handleCatFact(sock, msg);
                break;
            case '!dogfact':
                await handleDogFact(sock, msg);
                break;
            case '!remind':
                await handleRemind(sock, msg, args[0], args.slice(1).join(' '));
                break;
            case '!uuid':
                await handleUUID(sock, msg);
                break;
            case '!roll':
                await handleRoll(sock, msg, args[0]);
                break;
            case '!palindrome':
                await handlePalindrome(sock, msg, args.join(' '));
                break;
            case '!capitalize':
                await handleCapitalize(sock, msg, args.join(' '));
                break;
            case '!echo':
                if (!args.length) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!echo <text>\`\n🎯 *Example:* \`!echo Hello everyone!\`\n\n💫 *This command makes the bot repeat your message*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                const echoText = args.join(' ');
                await reply(sock, msg, `${BOT_STYLES.header}📢 *ECHO*\n${BOT_STYLES.divider}\n\n${echoText}\n\n💫 *Echo anything with:* \`!echo <text>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!vv':
                const vvChatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
                console.log(`🔓 !vv command triggered in ${vvChatType} chat by ${msg.key.participant || msg.key.remoteJid}`);
                await handleViewOnceUnlock(sock, msg);
                break;
            case '!viewonce':
                const viewOnceChatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
                await reply(sock, msg, `${BOT_STYLES.header}🔓 *VIEW-ONCE UNLOCKER*\n${BOT_STYLES.divider}\n\nThe bot automatically unlocks view-once media!\n\n📱 *How it works:*\n• Send any view-once image/video to the bot\n• The bot will automatically capture and repost it\n• Now you can view it multiple times!\n\n💡 *Supported media:*\n• Images (view-once) ✅\n• Videos (view-once) ✅\n• Voice notes (view-once) ✅\n\n🎯 *Works in:*\n• Private chats ✅\n• Group chats ✅\n\n📊 *Current chat type:* ${viewOnceChatType}\n\n💫 *Never lose important media again!*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!test':
                const testChatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
                await reply(sock, msg, `${BOT_STYLES.header}✅ *BOT TEST SUCCESSFUL*\n${BOT_STYLES.divider}\n\n📱 *Chat Type:* ${testChatType}\n🔧 *Bot Status:* Working Perfectly\n💬 *Commands:* All Available\n🔓 *View-Once:* Ready to Unlock Media\n🎨 *Sticker:* Ready to Create\n\n🎯 *Features Status:*\n• Entertainment Commands ✅\n• View-Once Unlocking ✅\n• Utility Commands ✅\n• Group Management ✅\n• Anti-Spam Protection ✅\n• Anti-Link Protection ✅\n\n💫 *All Systems Operational*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                break;
            case '!sticker':
                console.log('🎨 !sticker command detected!');
                await handleSticker(sock, msg);
                break;
            // Group-only commands
            case '!tagall':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleTagAll(sock, msg);
                break;
            case '!kick':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleKick(sock, msg, args[0]);
                break;
            case '!add':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleAdd(sock, msg, args[0]);
                break;
            case '!promote':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handlePromote(sock, msg, args[0]);
                break;
            case '!demote':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleDemote(sock, msg, args[0]);
                break;
            case '!ban':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleBan(sock, msg, args[0]);
                break;
            case '!unban':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleUnban(sock, msg, args[0]);
                break;
            case '!groupinfo':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleGroupInfo(sock, msg);
                break;
            case '!setdesc':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleSetDesc(sock, msg, argstr);
                break;
            case '!setname':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleSetName(sock, msg, argstr);
                break;
            case '!antispam':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleAntispamCommand(sock, msg, args[0]);
                break;
            case '!antilink':
                if (!isGroup) return await reply(sock, msg, 'This command only works in groups.');
                await handleAntilinkCommand(sock, msg, args[0]);
                break;
            // Sudo commands
            case '!addsudo':
                await handleAddSudo(sock, msg, args[0]);
                break;
            case '!removesudo':
                await handleRemoveSudo(sock, msg, args[0]);
                break;
            case '!listsudo':
                await handleListSudo(sock, msg);
                break;
            case '!owner':
                const ownerUserId = msg.key.participant || msg.key.remoteJid;
                if (isBotOwner(ownerUserId)) {
                    await reply(sock, msg, `${BOT_STYLES.header}👑 *BOT OWNER INFO*\n${BOT_STYLES.divider}\n\n✅ *You are the bot owner!*\n📱 *Your ID:* ${ownerUserId}\n🔐 *Permissions:* Full access to all commands\n\n💫 *You can:*\n• Add/remove sudo users\n• Use all bot commands\n• Manage bot permissions${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                } else {
                    await reply(sock, msg, `${BOT_STYLES.header}👑 *BOT OWNER INFO*\n${BOT_STYLES.divider}\n\n❌ *You are not the bot owner*\n📱 *Your ID:* ${ownerUserId}\n🔐 *Bot Owner:* ${BOT_OWNER}\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
                }
                break;
            // Game commands
            case '!wordle':
                await handleWordle(sock, msg, args[0]);
                break;
            case '!hangman':
                await handleHangman(sock, msg, args[0]);
                break;
            case '!tictactoe':
                await handleTicTacToe(sock, msg, args[0]);
                break;
            case '!numberguess':
                await handleNumberGuess(sock, msg, args[0]);
                break;
            case '!wordchain':
                await handleWordChain(sock, msg, argstr);
                break;
            case '!emojiquiz':
                await handleEmojiQuiz(sock, msg);
                break;
            case '!riddle':
                await handleRiddle(sock, msg);
                break;
            case '!truthordare':
                await handleTruthOrDare(sock, msg);
                break;
            case '!wouldyourather':
                await handleWouldYouRather(sock, msg);
                break;
            case '!neverhaveiever':
                await handleNeverHaveIEver(sock, msg);
                break;
            case '!typinggame':
                await handleTypingGame(sock, msg, argstr);
                break;
            default:
                // Unknown command
                break;
        }
    } catch (e) {
        await reply(sock, msg, '❌ Error: ' + e.message);
    }
}

// --- Command Handlers ---

async function handleMotivate(sock, msg) {
    // Use type.fit API (no key)
    try {
        const res = await fetch('https://type.fit/api/quotes');
        const quotes = await res.json();
        const q = quotes[Math.floor(Math.random() * quotes.length)];
        await reply(sock, msg, `${BOT_STYLES.header}💪 *MOTIVATIONAL QUOTE*\n${BOT_STYLES.divider}\n\n"${q.text}"\n\n👤 *Author:* ${q.author || 'Unknown'}\n\n💫 *Stay motivated with:* \`!motivate\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a motivational quote.\n\n💫 *Try again with:* \`!motivate\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleJoke(sock, msg) {
    try {
        const res = await fetch('https://official-joke-api.appspot.com/random_joke');
        const joke = await res.json();
        await reply(sock, msg, `${BOT_STYLES.header}😄 *RANDOM JOKE*\n${BOT_STYLES.divider}\n\n${joke.setup}\n\n${joke.punchline}\n\n💫 *Get another joke with:* \`!joke\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a joke.\n\n💫 *Try again with:* \`!joke\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleQuote(sock, msg) {
    try {
        const res = await fetch('https://api.quotable.io/random');
        const data = await res.json();
        await reply(sock, msg, `${BOT_STYLES.header}💭 *INSPIRATIONAL QUOTE*\n${BOT_STYLES.divider}\n\n"${data.content}"\n\n👤 *Author:* ${data.author}\n\n💫 *Get another quote with:* \`!quote\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a quote.\n\n💫 *Try again with:* \`!quote\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleTrivia(sock, msg) {
    try {
        const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
        const data = await res.json();
        const q = data.results[0];
        const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
        await reply(sock, msg, `${BOT_STYLES.header}❓ *TRIVIA QUESTION*\n${BOT_STYLES.divider}\n\n${q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}\n\n${options.map((o, i) => `${i+1}. ${o}`).join('\n')}\n\n💫 *Get another trivia with:* \`!trivia\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch trivia.\n\n💫 *Try again with:* \`!trivia\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleWeather(sock, msg, city) {
    if (!city) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!weather <city>\`\n🎯 *Example:* \`!weather New York\`\n\n💫 *Get current weather information for any city*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
        const txt = await res.text();
        await reply(sock, msg, `${BOT_STYLES.header}🌤️ *WEATHER INFORMATION*\n${BOT_STYLES.divider}\n\n${txt}\n\n💫 *Check another city with:* \`!weather <city>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch weather for ${city}.\n\n💫 *Try again with:* \`!weather <city>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleRPS(sock, msg, userMove) {
    const moves = ['rock', 'paper', 'scissors'];
    if (!userMove || !moves.includes(userMove.toLowerCase())) {
        return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!rps <rock|paper|scissors>\`\n🎯 *Example:* \`!rps rock\`\n\n💫 *Play Rock, Paper, Scissors against the bot*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
    const botMove = moves[Math.floor(Math.random() * 3)];
    let result = '';
    if (userMove === botMove) result = '🤝 Draw!';
    else if (
        (userMove === 'rock' && botMove === 'scissors') ||
        (userMove === 'paper' && botMove === 'rock') ||
        (userMove === 'scissors' && botMove === 'paper')
    ) result = '🎉 You win!';
    else result = '🤖 Bot wins!';
    
    const moveEmojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    
    await reply(sock, msg, `${BOT_STYLES.header}🎮 *ROCK PAPER SCISSORS*\n${BOT_STYLES.divider}\n\n👤 *You:* ${moveEmojis[userMove]} ${userMove.toUpperCase()}\n🤖 *Bot:* ${moveEmojis[botMove]} ${botMove.toUpperCase()}\n\n🏆 *Result:* ${result}\n\n💫 *Play again with:* \`!rps <rock|paper|scissors>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

async function handleTextArt(sock, msg, text) {
    if (!text) return await reply(sock, msg, 'Usage: !textart <text>');
    try {
        const res = await fetch(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`);
        const art = await res.text();
        await reply(sock, msg, '```\n' + art + '\n```');
    } catch {
        await reply(sock, msg, 'Could not generate ASCII art.');
    }
}

// --- Poll System ---
async function handlePoll(sock, msg, question) {
    if (!question) return await reply(sock, msg, 'Usage: !poll <question>');
    const db = loadDB();
    const pollId = msg.key.remoteJid + '_latest';
    db.polls[pollId] = {
        question,
        options: ['Yes', 'No', 'Maybe'],
        votes: {},
        created: Date.now(),
        creator: msg.key.participant || msg.key.remoteJid
    };
    saveDB(db);
    await reply(sock, msg, `📊 Poll created!\n${question}\n1. Yes\n2. No\n3. Maybe\nVote with !vote <number>`);
}

async function handleVote(sock, msg, num) {
    const db = loadDB();
    const pollId = msg.key.remoteJid + '_latest';
    const poll = db.polls[pollId];
    if (!poll) return await reply(sock, msg, 'No active poll. Create one with !poll <question>');
    const n = parseInt(num);
    if (![1,2,3].includes(n)) return await reply(sock, msg, 'Vote with !vote <number> (1, 2, or 3)');
    const voter = msg.key.participant || msg.key.remoteJid;
    poll.votes[voter] = n;
    saveDB(db);
    // Tally
    const tally = [0,0,0];
    Object.values(poll.votes).forEach(v => { if ([1,2,3].includes(v)) tally[v-1]++; });
    await reply(sock, msg, `Vote recorded!\n${poll.question}\n1. Yes: ${tally[0]}\n2. No: ${tally[1]}\n3. Maybe: ${tally[2]}`);
}

// --- XP & Rank System ---
async function handleXP(sock, msg) {
    const db = loadDB();
    const user = msg.key.participant || msg.key.remoteJid;
    if (!db.xp[user]) db.xp[user] = 0;
    db.xp[user] += 10;
    saveDB(db);
    await reply(sock, msg, `${BOT_STYLES.header}⭐ *XP EARNED*\n${BOT_STYLES.divider}\n\n🎯 *Earned:* +10 XP\n📊 *Total XP:* ${db.xp[user]}\n\n💫 *Earn more XP with:* \`!xp\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

async function handleRank(sock, msg) {
    const db = loadDB();
    const user = msg.key.participant || msg.key.remoteJid;
    const entries = Object.entries(db.xp).sort((a,b) => b[1]-a[1]);
    const rank = entries.findIndex(([u]) => u === user) + 1;
    const xp = db.xp[user] || 0;
    await reply(sock, msg, `${BOT_STYLES.header}🏆 *RANKING*\n${BOT_STYLES.divider}\n\n📊 *Your XP:* ${xp}\n🏅 *Your Rank:* #${rank} of ${entries.length}\n\n💫 *Check your rank with:* \`!rank\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

// --- Dictionary & Utility Handlers ---
async function handleDefine(sock, msg, word) {
    if (!word) return await reply(sock, msg, 'Usage: !define <word>');
    try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.meanings?.length) {
            const meaning = data[0].meanings[0].definitions[0].definition;
            await reply(sock, msg, `*${word}*: ${meaning}`);
        } else {
            await reply(sock, msg, `No definition found for "${word}".`);
        }
    } catch {
        await reply(sock, msg, 'Could not fetch definition.');
    }
}

async function handleBinary(sock, msg, text) {
    if (!text) return await reply(sock, msg, 'Usage: !binary <text>');
    const bin = text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    await reply(sock, msg, bin);
}

async function handleUnbinary(sock, msg, binary) {
    if (!binary) return await reply(sock, msg, 'Usage: !unbinary <binary>');
    try {
        const text = binary.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
        await reply(sock, msg, text);
    } catch {
        await reply(sock, msg, 'Invalid binary input.');
    }
}

const EMOJI_DESCRIPTIONS = {
    '😀': 'Grinning face',
    '😂': 'Face with tears of joy',
    '😍': 'Smiling face with heart-eyes',
    '👍': 'Thumbs up',
    '🙏': 'Folded hands',
    '🔥': 'Fire',
    '🥺': 'Pleading face',
    '😎': 'Smiling face with sunglasses',
    '🎉': 'Party popper',
    '💯': 'Hundred points',
    // Add more as needed
};

async function handleEmoji(sock, msg, emoji) {
    if (!emoji) return await reply(sock, msg, 'Usage: !emoji <emoji>');
    const desc = EMOJI_DESCRIPTIONS[emoji] || 'No description found.';
    await reply(sock, msg, `${emoji}: ${desc}`);
}

async function handleCountdown(sock, msg, seconds) {
    const s = parseInt(seconds);
    if (isNaN(s) || s < 1 || s > 30) return await reply(sock, msg, 'Usage: !countdown <seconds> (1-30)');
    for (let i = s; i > 0; i--) {
        await reply(sock, msg, `⏳ ${i}...`);
        await new Promise(res => setTimeout(res, 1000));
    }
    await reply(sock, msg, '⏰ Time is up!');
}

async function handleBible(sock, msg) {
    try {
        const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
        const data = await res.json();
        const v = data[0];
        await reply(sock, msg, `${BOT_STYLES.header}📖 *BIBLE VERSE*\n${BOT_STYLES.divider}\n\n📚 *Reference:* ${v.bookname} ${v.chapter}:${v.verse}\n\n${v.text}\n\n💫 *Get another verse with:* \`!bible\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a Bible verse.\n\n💫 *Try again with:* \`!bible\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleFact(sock, msg) {
    try {
        const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
        const data = await res.json();
        await reply(sock, msg, `${BOT_STYLES.header}🧠 *RANDOM FACT*\n${BOT_STYLES.divider}\n\n${data.text}\n\n💫 *Get another fact with:* \`!fact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a fact.\n\n💫 *Try again with:* \`!fact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

// --- Tagall Handler ---
async function handleTagAll(sock, msg) {
    try {
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants.map(p => p.id);
        const mentions = participants;
        const text = participants.map(id => `@${id.split('@')[0]}`).join(' ');
        await sock.sendMessage(msg.key.remoteJid, { text, mentions }, { quoted: msg });
    } catch {
        await reply(sock, msg, 'Could not tag everyone.');
    }
}

// --- New Command Handlers ---
async function handleCatFact(sock, msg) {
    try {
        const res = await fetch('https://catfact.ninja/fact');
        const data = await res.json();
        await reply(sock, msg, `${BOT_STYLES.header}🐱 *CAT FACT*\n${BOT_STYLES.divider}\n\n${data.fact}\n\n💫 *Get another cat fact with:* \`!catfact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a cat fact.\n\n💫 *Try again with:* \`!catfact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleDogFact(sock, msg) {
    try {
        const res = await fetch('https://dog-api.kinduff.com/api/facts');
        const data = await res.json();
        await reply(sock, msg, `${BOT_STYLES.header}🐕 *DOG FACT*\n${BOT_STYLES.divider}\n\n${data.facts[0]}\n\n💫 *Get another dog fact with:* \`!dogfact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch a dog fact.\n\n💫 *Try again with:* \`!dogfact\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleRemind(sock, msg, seconds, text) {
    const s = parseInt(seconds);
    if (isNaN(s) || s < 1 || s > 3600 || !text) return await reply(sock, msg, 'Usage: !remind <seconds 1-3600> <text>');
    await reply(sock, msg, `⏰ Reminder set for ${s} seconds.`);
    setTimeout(() => {
        reply(sock, msg, `🔔 Reminder: ${text}`);
    }, s * 1000);
}

async function handleUUID(sock, msg) {
    const uuid = crypto.randomUUID();
    await reply(sock, msg, `${BOT_STYLES.header}🆔 *UUID GENERATOR*\n${BOT_STYLES.divider}\n\n${uuid}\n\n💫 *Generate another with:* \`!uuid\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

async function handleRoll(sock, msg, sides) {
    const n = parseInt(sides);
    if (isNaN(n) || n < 2 || n > 100) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!roll <sides 2-100>\`\n🎯 *Example:* \`!roll 20\`\n\n💫 *Roll a dice with specified number of sides*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    const result = Math.floor(Math.random() * n) + 1;
    await reply(sock, msg, `${BOT_STYLES.header}🎲 *DICE ROLL*\n${BOT_STYLES.divider}\n\n🎯 *Result:* ${result}\n📊 *Range:* 1-${n}\n🎲 *Sides:* ${n}\n\n💫 *Roll again with:* \`!roll ${n}\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

async function handlePalindrome(sock, msg, text) {
    if (!text) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!palindrome <text>\`\n🎯 *Example:* \`!palindrome racecar\`\n\n💫 *Check if text reads the same forwards and backwards*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    const clean = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const isPal = clean === clean.split('').reverse().join('');
    const result = isPal ? '✅ Yes, it\'s a palindrome!' : '❌ No, it\'s not a palindrome.';
    await reply(sock, msg, `${BOT_STYLES.header}🔄 *PALINDROME CHECKER*\n${BOT_STYLES.divider}\n\n📝 *Text:* ${text}\n🔍 *Result:* ${result}\n\n💫 *Check another with:* \`!palindrome <text>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

async function handleCapitalize(sock, msg, text) {
    if (!text) return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!capitalize <text>\`\n🎯 *Example:* \`!capitalize hello world\`\n\n💫 *Capitalize the first letter of each word*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    const capitalized = text.replace(/\b\w/g, c => c.toUpperCase());
    await reply(sock, msg, `${BOT_STYLES.header}📝 *TEXT CAPITALIZER*\n${BOT_STYLES.divider}\n\n📝 *Original:* ${text}\n📝 *Capitalized:* ${capitalized}\n\n💫 *Capitalize more with:* \`!capitalize <text>\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
}

// --- New Utility Commands ---

async function handleDateDiff(sock, msg, date1, date2) {
    if (!date1 || !date2) {
        return await reply(sock, msg, 'Usage: !datediff <date1> <date2>\nExample: !datediff 2024-01-01 2025-01-01');
    }
    
    try {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
            return await reply(sock, msg, '❌ Invalid date format. Use YYYY-MM-DD format.');
        }
        
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        await reply(sock, msg, `📅 *Date Difference*\n\n📆 From: ${d1.toDateString()}\n📆 To: ${d2.toDateString()}\n\n⏰ *Difference:* ${diffDays} days`);
    } catch (error) {
        await reply(sock, msg, '❌ Error calculating date difference. Please check your date format.');
    }
}

async function handleTimeIn(sock, msg, location) {
    if (!location) {
        return await reply(sock, msg, 'Usage: !timein <city/region>\nExample: !timein London');
    }
    
    try {
        const response = await fetch(`http://worldtimeapi.org/api/timezone/${encodeURIComponent(location)}`);
        const data = await response.json();
        
        if (data.error) {
            return await reply(sock, msg, `❌ Location not found: ${location}\n\n💡 Try using a major city name like: London, New York, Tokyo`);
        }
        
        const datetime = new Date(data.datetime);
        const timeString = datetime.toLocaleString('en-US', {
            timeZone: data.timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        await reply(sock, msg, `🕒 *Time in ${data.timezone}*\n\n⏰ ${timeString}\n🌍 Timezone: ${data.abbreviation}\n📅 Day: ${data.day_of_week}`);
    } catch (error) {
        await reply(sock, msg, '❌ Could not fetch time for that location. Please try again.');
    }
}

async function handleShorten(sock, msg, url) {
    if (!url) {
        return await reply(sock, msg, 'Usage: !shorten <url>\nExample: !shorten https://www.google.com');
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        const shortUrl = await response.text();
        
        if (shortUrl.startsWith('http')) {
            await reply(sock, msg, `🔗 *URL Shortened*\n\n📤 Original: ${url}\n📥 Shortened: ${shortUrl}`);
        } else {
            await reply(sock, msg, '❌ Could not shorten URL. Please check if the URL is valid.');
        }
    } catch (error) {
        await reply(sock, msg, '❌ Error shortening URL. Please try again.');
    }
}

async function handleTempMail(sock, msg) {
    try {
        const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        const emails = await response.json();
        
        if (emails && emails.length > 0) {
            const email = emails[0];
            await reply(sock, msg, `📧 *Temporary Email*\n\n📮 Email: ${email}\n\n💡 This email will receive messages for 1 hour.\n🔗 Check messages at: https://www.1secmail.com/?login=${email.split('@')[0]}&domain=${email.split('@')[1]}`);
        } else {
            await reply(sock, msg, '❌ Could not generate temporary email. Please try again.');
        }
    } catch (error) {
        await reply(sock, msg, '❌ Error generating temporary email. Please try again.');
    }
}

async function handleColor(sock, msg, hex) {
    if (!hex) {
        return await reply(sock, msg, 'Usage: !color <hex>\nExample: !color #FF0000');
    }
    
    // Remove # if present
    hex = hex.replace('#', '');
    
    if (!/^[0-9A-F]{6}$/i.test(hex)) {
        return await reply(sock, msg, '❌ Invalid hex color. Use format: #FF0000 or FF0000');
    }
    
    try {
        const response = await fetch(`https://www.thecolorapi.com/id?hex=${hex}`);
        const data = await response.json();
        
        if (data.name) {
            await reply(sock, msg, `🎨 *Color Information*\n\n🔴 Hex: #${hex.toUpperCase()}\n📝 Name: ${data.name.value}\n🎯 RGB: ${data.rgb.value}\n🌐 HSL: ${data.hsl.value}\n\n💡 ${data.name.closest_named_hex ? `Closest named color: ${data.name.closest_named_hex}` : ''}`);
        } else {
            await reply(sock, msg, `🎨 *Color Information*\n\n🔴 Hex: #${hex.toUpperCase()}\n📝 Name: Unknown color`);
        }
    } catch (error) {
        await reply(sock, msg, '❌ Error fetching color information. Please try again.');
    }
}

async function handlePassword(sock, msg, length) {
    const len = parseInt(length) || 12;
    
    if (len < 4 || len > 50) {
        return await reply(sock, msg, '❌ Password length must be between 4 and 50 characters.');
    }
    
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < len; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    await reply(sock, msg, `🔐 *Random Password*\n\n📏 Length: ${len} characters\n🔑 Password: \`${password}\`\n\n💡 Copy the password above (between backticks)`);
}

// --- Weather & Info Commands ---

async function handleCountry(sock, msg, countryName) {
    if (!countryName) {
        return await reply(sock, msg, 'Usage: !country <country name>\nExample: !country Nigeria');
    }
    
    try {
        const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
        const countries = await response.json();
        
        if (countries.status === 404) {
            return await reply(sock, msg, `❌ Country not found: ${countryName}`);
        }
        
        const country = countries[0];
        const currencies = country.currencies ? Object.values(country.currencies).map(c => `${c.name} (${c.symbol})`).join(', ') : 'N/A';
        const languages = country.languages ? Object.values(country.languages).join(', ') : 'N/A';
        
        await reply(sock, msg, `🏳️ *Country Information*\n\n🏛️ Name: ${country.name.common}\n🏙️ Capital: ${country.capital?.[0] || 'N/A'}\n🌍 Region: ${country.region}\n👥 Population: ${country.population?.toLocaleString() || 'N/A'}\n💱 Currency: ${currencies}\n🗣️ Languages: ${languages}\n📱 Calling Code: +${country.idd.root}${country.idd.suffixes?.[0] || ''}\n🌐 Domain: .${country.tld?.[0] || 'N/A'}`);
    } catch (error) {
        await reply(sock, msg, '❌ Error fetching country information. Please try again.');
    }
}

// --- Crypto Commands ---

async function handleCrypto(sock, msg, coin) {
    if (!coin) {
        return await reply(sock, msg, 'Usage: !crypto <coin>\nExamples: !crypto bitcoin, !crypto ethereum, !crypto btc');
    }
    
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.toLowerCase()}&vs_currencies=usd,eur,btc&include_24hr_change=true&include_market_cap=true`);
        const data = await response.json();
        
        if (data[coin.toLowerCase()]) {
            const coinData = data[coin.toLowerCase()];
            const change24h = coinData.usd_24h_change;
            const changeEmoji = change24h >= 0 ? '📈' : '📉';
            
            await reply(sock, msg, `💰 *${coin.toUpperCase()} Price*\n\n💵 USD: $${coinData.usd?.toLocaleString() || 'N/A'}\n💶 EUR: €${coinData.eur?.toLocaleString() || 'N/A'}\n₿ BTC: ${coinData.btc?.toFixed(8) || 'N/A'}\n\n${changeEmoji} 24h Change: ${change24h?.toFixed(2)}%\n💼 Market Cap: $${coinData.usd_market_cap?.toLocaleString() || 'N/A'}`);
        } else {
            await reply(sock, msg, `❌ Coin not found: ${coin}\n\n💡 Try common coins like: bitcoin, ethereum, btc, eth, dogecoin`);
        }
    } catch (error) {
        await reply(sock, msg, '❌ Error fetching crypto price. Please try again.');
    }
}

// --- Fun & Motivation Commands ---

async function handleWordDay(sock, msg) {
    try {
        const response = await fetch('https://api.wordnik.com/v4/words.json/wordOfTheDay?api_key=' + (process.env.WORDNIK_API_KEY || ''));
        const data = await response.json();
        
        await reply(sock, msg, `${BOT_STYLES.header}📚 *WORD OF THE DAY*\n${BOT_STYLES.divider}\n\n📖 *Word:* ${data.word}\n📝 *Definition:* ${data.definitions?.[0]?.text || 'No definition available'}\n📅 *Date:* ${data.publishDate}\n\n💡 *Example:* ${data.examples?.[0]?.text || 'No example available'}\n\n💫 *Get tomorrow's word with:* \`!wordday\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    } catch (error) {
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nCould not fetch word of the day.\n\n💫 *Try again with:* \`!wordday\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}



// --- Group Management Commands ---
async function handleKick(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !kick @user');
        const participant = user.replace('@', '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'remove');
        await reply(sock, msg, `Kicked ${user} from the group.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to kick user. Make sure you have admin rights.');
    }
}

async function handleAdd(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !add <phone_number>');
        const participant = user.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'add');
        await reply(sock, msg, `Added ${user} to the group.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to add user.');
    }
}

async function handlePromote(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !promote @user');
        const participant = user.replace('@', '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'promote');
        await reply(sock, msg, `Promoted ${user} to admin.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to promote user. Make sure you have admin rights.');
    }
}

async function handleDemote(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !demote @user');
        const participant = user.replace('@', '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'demote');
        await reply(sock, msg, `Demoted ${user} from admin.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to demote user. Make sure you have admin rights.');
    }
}

async function handleBan(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !ban @user');
        const participant = user.replace('@', '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'remove');
        await reply(sock, msg, `Banned ${user} from the group.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to ban user. Make sure you have admin rights.');
    }
}

async function handleUnban(sock, msg, user) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) return await reply(sock, msg, 'Usage: !unban <phone_number>');
        const participant = user.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [participant], 'add');
        await reply(sock, msg, `Unbanned ${user} and added back to group.`);
    } catch (e) {
        await reply(sock, msg, 'Failed to unban user.');
    }
}

async function handleGroupInfo(sock, msg) {
    try {
        const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
        const participants = groupMetadata.participants;
        const admins = participants.filter(p => p.admin).length;
        const members = participants.length;
        
        const info = `📊 *Group Info*\n\n` +
                    `*Name:* ${groupMetadata.subject}\n` +
                    `*Description:* ${groupMetadata.desc || 'No description'}\n` +
                    `*Members:* ${members}\n` +
                    `*Admins:* ${admins}\n` +
                    `*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}`;
        
        await reply(sock, msg, info);
    } catch (e) {
        await reply(sock, msg, 'Failed to get group info.');
    }
}

async function handleSetDesc(sock, msg, desc) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!desc) return await reply(sock, msg, 'Usage: !setdesc <description>');
        await sock.groupUpdateDescription(msg.key.remoteJid, desc);
        await reply(sock, msg, 'Group description updated successfully.');
    } catch (e) {
        await reply(sock, msg, 'Failed to update group description. Make sure you have admin rights.');
    }
}

async function handleSetName(sock, msg, name) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!name) return await reply(sock, msg, 'Usage: !setname <new_name>');
        await sock.groupUpdateSubject(msg.key.remoteJid, name);
        await reply(sock, msg, 'Group name updated successfully.');
    } catch (e) {
        await reply(sock, msg, 'Failed to update group name. Make sure you have admin rights.');
    }
}

// --- Antispam Command Handler ---
async function handleAntispamCommand(sock, msg, arg) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        const groupId = msg.key.remoteJid;
        if (!arg) {
            const status = antispamSettings[groupId] ? 'ENABLED' : 'DISABLED';
            return await reply(sock, msg, `🛡️ Antispam is currently *${status}* in this group.\nUsage: !antispam on | off | status`);
        }
        if (arg.toLowerCase() === 'on') {
            antispamSettings[groupId] = true;
            await reply(sock, msg, '🛡️ Antispam has been *ENABLED* for this group. Spammers will be removed!');
        } else if (arg.toLowerCase() === 'off') {
            antispamSettings[groupId] = false;
            await reply(sock, msg, '🛡️ Antispam has been *DISABLED* for this group.');
        } else if (arg.toLowerCase() === 'status') {
            const status = antispamSettings[groupId] ? 'ENABLED' : 'DISABLED';
            await reply(sock, msg, `🛡️ Antispam is currently *${status}* in this group.`);
        } else {
            await reply(sock, msg, 'Usage: !antispam on | off | status');
        }
    } catch (e) {
        await reply(sock, msg, 'Failed to configure antispam. Make sure you have admin rights.');
    }
}

// --- Antilink Command Handler ---
async function handleAntilinkCommand(sock, msg, arg) {
    try {
        // Check permissions
        if (!await hasAdminPermission(sock, msg)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 You need admin or sudo permissions to use this command.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        const groupId = msg.key.remoteJid;
        if (!arg) {
            const status = antilinkSettings[groupId] ? 'ENABLED' : 'DISABLED';
            return await reply(sock, msg, `🚫 Antilink is currently *${status}* in this group.\nUsage: !antilink on | off | status`);
        }
        if (arg.toLowerCase() === 'on') {
            antilinkSettings[groupId] = true;
            await reply(sock, msg, '🚫 Antilink has been *ENABLED* for this group. Users sharing links will be removed!');
        } else if (arg.toLowerCase() === 'off') {
            antilinkSettings[groupId] = false;
            await reply(sock, msg, '🚫 Antilink has been *DISABLED* for this group.');
        } else if (arg.toLowerCase() === 'status') {
            const status = antilinkSettings[groupId] ? 'ENABLED' : 'DISABLED';
            await reply(sock, msg, `🚫 Antilink is currently *${status}* in this group.`);
        } else {
            await reply(sock, msg, 'Usage: !antilink on | off | status');
        }
    } catch (e) {
        await reply(sock, msg, 'Failed to configure antilink. Make sure you have admin rights.');
    }
}

// --- View Once Unlock Handler (WORKING VERSION) ---
async function handleViewOnceUnlock(sock, msg) {
    try {
        const chatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
        console.log(`🔍 handleViewOnceUnlock called in ${chatType} chat`);
        
        // Check if this is a reply to a message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return await reply(sock, msg, '❌ Reply to a view-once image or video with !vv to unlock it.\n\n💡 *How to use:*\n1. Send a view-once image/video to the chat\n2. Reply to that message with !vv\n3. The bot will unlock and resend it');
        }

        // Try to detect any media type
        let mediaType = null;
        let isViewOnce = false;

        // Check for any image message
        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            isViewOnce = quotedMsg.imageMessage.viewOnce || false;
        }
        // Check for any video message
        else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            isViewOnce = quotedMsg.videoMessage.viewOnce || false;
        }
        // Check for any audio message
        else if (quotedMsg.audioMessage) {
            mediaType = 'audio';
            isViewOnce = quotedMsg.audioMessage.viewOnce || false;
        }

        if (!mediaType) {
            return await reply(sock, msg, '❌ No media found in the replied message.\n\n💡 Reply to an image, video, or audio message.');
        }

        // Get the quoted message details
        const quotedId = msg.message.extendedTextMessage.contextInfo.stanzaId;
        const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;
        
        if (!quotedId) {
            return await reply(sock, msg, '❌ Could not identify the original message. Try again.');
        }

        // Create the message key for the quoted message
        const quotedKey = {
            remoteJid: msg.key.remoteJid,
            fromMe: false,
            id: quotedId,
            participant: quotedParticipant
        };

        console.log(`🔍 Attempting to download ${mediaType}...`);

        // Download the media using the correct method
        let buffer = null;
        
        try {
            console.log('🔄 Attempting to download media...');
            
            // Use the correct downloadContentFromMessage method
            if (quotedMsg.imageMessage) {
                const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                console.log(`✅ Downloaded image via Baileys, size: ${buffer.length} bytes`);
            } else if (quotedMsg.videoMessage) {
                const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
                buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                console.log(`✅ Downloaded video via Baileys, size: ${buffer.length} bytes`);
            } else if (quotedMsg.audioMessage) {
                const stream = await downloadContentFromMessage(quotedMsg.audioMessage, 'audio');
                buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                console.log(`✅ Downloaded audio via Baileys, size: ${buffer.length} bytes`);
            } else {
                throw new Error('No supported media type found');
            }
        } catch (e) {
            console.log('❌ Download failed:', e.message);
            return await reply(sock, msg, `❌ Could not download the media: ${e.message}\n\n💡 This might be because:\n• The media has already been viewed\n• The media has expired\n• You don't have permission to access it\n\n🔧 Try with a fresh media that hasn't been viewed yet.`);
        }

        if (!buffer || buffer.length === 0) {
            return await reply(sock, msg, '❌ Downloaded media is empty.\n\n💡 Try with a different media file.');
        }
        
        // Basic size check only (no file header validation)
        if (buffer.length < 100) {
            return await reply(sock, msg, '❌ Downloaded media is too small (likely corrupted).\n\n💡 Try with a different media file.');
        }

        // Send the media back
        const caption = `🔓 *${isViewOnce ? 'View-once' : 'Media'} ${mediaType} unlocked*\n\n💡 *BIG TENNET Bot* made this ${mediaType} viewable multiple times!`;

        try {
            if (mediaType === 'image') {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: buffer,
                    caption: caption
                });
            } else if (mediaType === 'video') {
                await sock.sendMessage(msg.key.remoteJid, {
                    video: buffer,
                    caption: caption
                });
            } else if (mediaType === 'audio') {
                await sock.sendMessage(msg.key.remoteJid, {
                    audio: buffer,
                    caption: caption
                });
            }
            
            console.log(`✅ Successfully sent ${mediaType}`);
            await reply(sock, msg, `✅ Successfully unlocked and sent ${mediaType}!`);
        } catch (sendError) {
            console.error('❌ Error sending media:', sendError);
            await reply(sock, msg, `❌ Downloaded ${mediaType} but failed to send it. Error: ${sendError.message}`);
        }

    } catch (error) {
        console.error('❌ View-once unlock error:', error);
        const chatType = msg.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
        await reply(sock, msg, `❌ Failed to unlock media in ${chatType} chat.\n\n💡 *Troubleshooting:*\n• Make sure you replied to an image/video/audio message\n• The media hasn't been viewed yet\n• You have permission to access it\n• Try with a fresh view-once media\n\n🔧 *Note:* The !vv command works in both private chats and groups.`);
    }
}

// --- Sticker Handler ---
async function handleSticker(sock, msg) {
    try {
        console.log('🎨 Sticker command triggered');
        console.log('🎨 Message content:', JSON.stringify(msg.message, null, 2));
        
        // Check if this is a reply to a message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return await reply(sock, msg, `🎨 *Sticker Creator*\n\n📱 *How to use:*\n• Reply to an image or video with !sticker\n• The bot will convert it to a sticker\n\n💡 *Supported formats:*\n• Images (JPG, PNG, GIF)\n• Videos (MP4, MOV)\n• Max size: 5MB\n\n🎯 *Works in:*\n• Private chats ✅\n• Group chats ✅\n\nCreated by ${CREATOR_INFO.name}`);
        }

        // Check for media types
        let mediaType = null;
        let mediaMessage = null;

        if (quotedMsg.imageMessage) {
            mediaType = 'image';
            mediaMessage = quotedMsg.imageMessage;
        } else if (quotedMsg.videoMessage) {
            mediaType = 'video';
            mediaMessage = quotedMsg.videoMessage;
        } else {
            return await reply(sock, msg, '❌ No image or video found in the replied message.\n\n💡 Reply to an image or video with !sticker to convert it.');
        }

        console.log(`🎨 Converting ${mediaType} to sticker...`);

        // Download the media
        let buffer = null;
        try {
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            console.log(`✅ Downloaded ${mediaType}, size: ${buffer.length} bytes`);
        } catch (e) {
            console.log('❌ Failed to download media:', e.message);
            return await reply(sock, msg, '❌ Failed to download the media. Please try again.');
        }

        if (!buffer || buffer.length === 0) {
            return await reply(sock, msg, '❌ Downloaded media is empty. Please try again.');
        }

        // Check file size (max 5MB for free APIs)
        if (buffer.length > 5 * 1024 * 1024) {
            return await reply(sock, msg, '❌ File too large! Maximum size is 5MB for sticker conversion.');
        }

        // Convert to sticker using free API
        try {
            console.log('🔄 Converting to sticker...');
            
            // For now, we'll send the image directly as a sticker
            // WhatsApp will handle the conversion automatically
            if (mediaType === 'image') {
                await sock.sendMessage(msg.key.remoteJid, {
                    sticker: buffer
                }, { quoted: msg });
                
                console.log('✅ Image sticker sent successfully');
                await reply(sock, msg, '✅ Image converted to sticker successfully! 🎨');
            } else if (mediaType === 'video') {
                // For videos, we'll send as a video sticker
                await sock.sendMessage(msg.key.remoteJid, {
                    sticker: buffer,
                    isAnimated: true
                }, { quoted: msg });
                
                console.log('✅ Video sticker sent successfully');
                await reply(sock, msg, '✅ Video converted to animated sticker successfully! 🎬');
            }

        } catch (conversionError) {
            console.error('❌ Sticker conversion error:', conversionError);
            await reply(sock, msg, '❌ Failed to convert to sticker. Please try with a different image/video.');
        }

    } catch (error) {
        console.error('❌ Sticker handler error:', error);
        await reply(sock, msg, '❌ An error occurred while creating the sticker. Please try again.');
    }
}

// --- Sticker Conversion Function ---
async function convertToSticker(buffer, mediaType) {
    try {
        console.log(`🔄 Converting ${mediaType} to sticker format...`);
        
        // For now, we'll use a simple approach that works with WhatsApp's sticker format
        // WhatsApp stickers are typically WebP format with specific dimensions
        
        if (mediaType === 'image') {
            // For images, we can try to send them directly as stickers
            // WhatsApp will handle the conversion automatically
            return buffer;
        } else if (mediaType === 'video') {
            // For videos, we'll extract the first frame and convert it
            // This is a simplified approach - in production you'd use ffmpeg
            console.log('📹 Video to sticker conversion (simplified)');
            return buffer; // Return original for now
        }
        
        return buffer;
        
    } catch (error) {
        console.error('❌ Sticker conversion error:', error);
        return null;
    }
}

// --- Sudo Command Handlers ---

async function handleAddSudo(sock, msg, user) {
    try {
        // Check if the user is the bot owner
        const userId = msg.key.participant || msg.key.remoteJid;
        
        if (!isBotOwner(userId)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 Only the bot owner can add sudo users.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!addsudo @user\`\n🎯 *Example:* \`!addsudo @1234567890\`\n\n💫 *Add a user to sudo permissions*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        // Extract user ID from mention or phone number
        let targetUserId = user;
        if (user.startsWith('@')) {
            targetUserId = user.replace('@', '') + '@s.whatsapp.net';
        } else {
            targetUserId = user.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }
        
        // Check if user is already sudo
        if (isSudoUser(targetUserId)) {
            return await reply(sock, msg, `${BOT_STYLES.header}⚠️ *USER ALREADY SUDO*\n${BOT_STYLES.divider}\n\n👤 User is already a sudo user.\n\n💫 *Check sudo users with:* \`!listsudo\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        // Add user to sudo
        sudoUsers.add(targetUserId);
        saveSudoUsers();
        
        await reply(sock, msg, `${BOT_STYLES.header}✅ *SUDO USER ADDED*\n${BOT_STYLES.divider}\n\n👤 *User:* ${user}\n🔓 *Permission:* Sudo (Bot Admin)\n\n💫 *User can now use admin commands in groups*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        
    } catch (e) {
        console.error('Error adding sudo user:', e);
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nFailed to add sudo user: ${e.message}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleRemoveSudo(sock, msg, user) {
    try {
        // Check if the user is the bot owner
        const userId = msg.key.participant || msg.key.remoteJid;
        
        if (!isBotOwner(userId)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 Only the bot owner can remove sudo users.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        if (!user) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *USAGE ERROR*\n${BOT_STYLES.divider}\n\n💡 *Usage:* \`!removesudo @user\`\n🎯 *Example:* \`!removesudo @1234567890\`\n\n💫 *Remove a user from sudo permissions*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        // Extract user ID from mention or phone number
        let targetUserId = user;
        if (user.startsWith('@')) {
            targetUserId = user.replace('@', '') + '@s.whatsapp.net';
        } else {
            targetUserId = user.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }
        
        // Check if user is sudo
        if (!isSudoUser(targetUserId)) {
            return await reply(sock, msg, `${BOT_STYLES.header}⚠️ *USER NOT SUDO*\n${BOT_STYLES.divider}\n\n👤 User is not a sudo user.\n\n💫 *Check sudo users with:* \`!listsudo\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        // Remove user from sudo
        sudoUsers.delete(targetUserId);
        saveSudoUsers();
        
        await reply(sock, msg, `${BOT_STYLES.header}✅ *SUDO USER REMOVED*\n${BOT_STYLES.divider}\n\n👤 *User:* ${user}\n🔒 *Permission:* Removed\n\n💫 *User can no longer use admin commands*${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        
    } catch (e) {
        console.error('Error removing sudo user:', e);
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nFailed to remove sudo user: ${e.message}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

async function handleListSudo(sock, msg) {
    try {
        // Check if the user is the bot owner
        const userId = msg.key.participant || msg.key.remoteJid;
        
        if (!isBotOwner(userId)) {
            return await reply(sock, msg, `${BOT_STYLES.header}❌ *ACCESS DENIED*\n${BOT_STYLES.divider}\n\n🔒 Only the bot owner can view sudo users.\n\n💡 *Contact:* ${CREATOR_INFO.name}\n📱 Instagram: @${CREATOR_INFO.ig}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        const sudoList = Array.from(sudoUsers);
        
        if (sudoList.length === 0) {
            return await reply(sock, msg, `${BOT_STYLES.header}📋 *SUDO USERS LIST*\n${BOT_STYLES.divider}\n\n📝 *No sudo users found.*\n\n💫 *Add sudo users with:* \`!addsudo @user\`${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        }
        
        const sudoListText = sudoList.map((user, index) => `${index + 1}. ${user.replace('@s.whatsapp.net', '')}`).join('\n');
        
        await reply(sock, msg, `${BOT_STYLES.header}📋 *SUDO USERS LIST*\n${BOT_STYLES.divider}\n\n${sudoListText}\n\n📊 *Total:* ${sudoList.length} sudo user(s)\n\n💫 *Manage sudo users with:*\n• \`!addsudo @user\` - Add sudo user\n• \`!removesudo @user\` - Remove sudo user${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
        
    } catch (e) {
        console.error('Error listing sudo users:', e);
        await reply(sock, msg, `${BOT_STYLES.header}❌ *ERROR*\n${BOT_STYLES.divider}\n\nFailed to list sudo users: ${e.message}${BOT_STYLES.creator}\n${BOT_STYLES.footer}`);
    }
}

startBot(); 