# 🤖 BIG TENNET WhatsApp Bot

A feature-rich WhatsApp bot built with Baileys library, featuring 50+ commands, games, group management, and more!

## ✨ Features

- 🎮 **10+ Multiplayer Games** (Wordle, Hangman, Tic Tac Toe, etc.)
- 🔓 **View-Once Media Unlocker** - Never lose important media again!
- 🎨 **Sticker Creator** - Convert images/videos to stickers
- 🛡️ **Group Protection** - Anti-spam and anti-link features
- 📊 **XP & Ranking System** - Gamify your group interactions
- 📋 **Poll System** - Create polls and vote
- 🌤️ **Weather & Info** - Get weather, country info, crypto prices
- 🎯 **50+ Commands** - Utility, fun, games, and group management
- 💬 **Private & Group Support** - Works in both chat types

## 🚀 Quick Deploy

### Option 1: Railway (Recommended)

1. **Fork this repository** to your GitHub account
2. Go to [railway.app](https://railway.app) and sign up
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repository
5. Railway will automatically detect it's a Node.js app
6. Click "Deploy Now"
7. Once deployed, click on your project
8. Go to "Variables" tab and add any environment variables if needed
9. The bot will start automatically!

### Option 2: Render

1. **Fork this repository** to your GitHub account
2. Go to [render.com](https://render.com) and sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `whatsapp-bot`
   - **Build Command**: `npm install`
   - **Start Command**: `node bot.js`
6. Click "Create Web Service"
7. Render will deploy your bot automatically!

### Option 3: Heroku

1. **Fork this repository** to your GitHub account
2. Go to [heroku.com](https://heroku.com) and sign up
3. Create a new app
4. Go to "Deploy" tab → "GitHub"
5. Connect your repository and deploy
6. The Procfile is already included!

## 📱 Local Setup

### Prerequisites
- Node.js 16+ installed
- WhatsApp account for the bot

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whatsapp-bot.git
   cd whatsapp-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the bot**
   ```bash
   npm start
   ```

4. **Scan QR Code**
   - A QR code will appear in your terminal
   - Scan it with your WhatsApp mobile app
   - The bot will connect and be ready to use!

## 🎯 Available Commands

### 📋 Help Commands
- `!help` - Get general help
- `!help <command>` - Get detailed help for a specific command
- `!list` - Show all available commands
- `!list <category>` - Show commands by category

### 🎮 Games
- `!wordle` - Play Wordle
- `!hangman` - Play Hangman
- `!tictactoe` - Play Tic Tac Toe
- `!numberguess` - Number guessing game
- `!wordchain` - Word chain game
- `!emojiquiz` - Emoji quiz
- `!riddle` - Random riddles
- `!truthordare` - Truth or Dare
- `!wouldyourather` - Would You Rather questions
- `!neverhaveiever` - Never Have I Ever statements
- `!typinggame` - Typing speed game

### 🛠️ Utility Commands
- `!ping` - Check if bot is online
- `!time` - Get current time
- `!weather <city>` - Get weather information
- `!shorten <url>` - Shorten URLs
- `!password [length]` - Generate random passwords
- `!uuid` - Generate UUID
- `!roll [sides]` - Roll dice
- `!reverse <text>` - Reverse text
- `!capitalize <text>` - Capitalize text
- `!palindrome <text>` - Check if text is palindrome

### 🎨 Media Commands
- `!sticker` - Convert image/video to sticker (reply to media)
- `!vv` - Unlock view-once media (reply to view-once message)
- `!viewonce` - Get info about view-once feature

### 🎭 Fun Commands
- `!motivate` - Get motivational quotes
- `!joke` - Get random jokes
- `!quote` - Get inspirational quotes
- `!trivia` - Random trivia questions
- `!fact` - Random facts
- `!catfact` - Cat facts
- `!dogfact` - Dog facts
- `!bible` - Random Bible verses
- `!coin` - Flip a coin
- `!rps <rock|paper|scissors>` - Rock Paper Scissors

### 📊 Group Commands
- `!tagall` - Tag all group members
- `!poll <question>` - Create a poll
- `!vote <number>` - Vote in poll
- `!xp` - Earn XP points
- `!rank` - Check your rank
- `!groupinfo` - Get group information
- `!antispam <on|off>` - Configure anti-spam
- `!antilink <on|off>` - Configure anti-link

### 👑 Admin Commands
- `!kick @user` - Kick user from group
- `!add <phone>` - Add user to group
- `!promote @user` - Promote user to admin
- `!demote @user` - Demote admin to member
- `!ban @user` - Ban user from group
- `!unban <phone>` - Unban user
- `!setname <name>` - Change group name
- `!setdesc <description>` - Change group description

### 🔐 Sudo Commands (Owner Only)
- `!addsudo @user` - Add user to sudo permissions (bot admin)
- `!removesudo @user` - Remove user from sudo permissions
- `!listsudo` - List all sudo users
- `!owner` - Check if you are the bot owner

**Note:** 
- **By default, only the bot owner can use the bot**
- Sudo users can use all bot commands in groups
- You must add users as sudo to give them access to the bot

## 🔧 Configuration

### Setting Up Bot Owner (Required)

**IMPORTANT:** You must set your phone number as the bot owner before anyone can use the bot!

1. **Open `bot.js`** and find this line:
   ```javascript
   const BOT_OWNER = 'YOUR_PHONE_NUMBER@s.whatsapp.net'; // e.g., '2348124269148@s.whatsapp.net'
   ```

2. **Replace `YOUR_PHONE_NUMBER`** with your actual phone number:
   ```javascript
   const BOT_OWNER = '2348124269148@s.whatsapp.net'; // Replace with your number
   ```

3. **Format:** Use your country code + phone number without any special characters
   - Example: `2348124269148@s.whatsapp.net`
   - No spaces, dashes, or parentheses

4. **Restart the bot** after making this change

5. **Test:** Use `!owner` command to verify you're set as the bot owner

**Security:** By default, only you (the bot owner) can use the bot. You must manually add other users with `!addsudo @user` to give them access.

### Environment Variables (Optional)
Create a `.env` file in the root directory:

```env
# Optional: Set custom bot name
BOT_NAME=BIG TENNET Bot

# Optional: Set custom prefix (default is !)
COMMAND_PREFIX=!
```

## 📁 Project Structure

```
whatsapp-bot/
├── bot.js              # Main bot file
├── package.json        # Dependencies and scripts
├── Procfile           # Heroku deployment
├── .gitignore         # Git ignore rules
├── README.md          # This file
├── auth_info/         # WhatsApp session data (auto-generated)
└── db.json           # Database file (auto-generated)
```

## 🛡️ Security Features

- **Anti-Spam Protection** - Automatically removes spammers
- **Anti-Link Protection** - Removes users who share links
- **Group Management** - Full admin command support
- **Session Security** - Secure WhatsApp session handling

## 🎨 Customization

The bot includes your branding:
- **Creator**: BIG TENNET
- **Instagram**: @bigtennet
- **Website**: https://tennetteam.com

All responses include your creator information and social media links.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you need help:
1. Check the `!help` command in the bot
2. Review this README
3. Open an issue on GitHub

## 🙏 Credits

- **Creator**: BIG TENNET
- **Library**: [@whiskeysockets/baileys](https://github.com/whiskeysockets/baileys)
- **Inspired by**: WhatsApp Web API

---

**Made with ❤️ by BIG TENNET**

📱 Instagram: [@bigtennet](https://instagram.com/bigtennet)  
🌐 Website: [tennetteam.com](https://tennetteam.com) 