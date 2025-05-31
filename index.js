require('dotenv').config(); // .envファイルからトークンを読み込む
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Webサーバーの起動（Render用）
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// Discord Botの初期化
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Botが起動したときの動作
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// チャットに反応する例（!ping と言うと Pong! と返す）
client.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

// Discordにログイン（トークンは.envから読み込む）
client.login(process.env.TOKEN);
