<div align="center">
  <br />
  <p>
    <a href="https://dpm.js.org"><img src="https://dpm.js.org/static/dpm.png" width="546" alt="DPM Main Image" /></a>
  </p>
  <br/>
  <p>
    <a href="https://discord.gg/zzbkvCcu2r"><img src="https://img.shields.io/discord/827221018879328298?color=5865F2&logo=discord&logoColor=white" alt="Support server" /></a>
    <a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/v/discord-player-music.png?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/dt/discord-player-music.png?maxAge=3600" alt="NPM downloads" /></a>
  </p>
</div>

<h1 style="text-align: center">Welcome to the 'discord-player-music' page!</h1>

## About

**Discord Player Music is a powerful [Node.js](https://nodejs.org) music module for your Discord.js bot that based on Promises and has a lot of features.**

* 👍 Simple & easy to use
* 😄 Beginner friendly
* 🎸 Audio filters
* 📌 Guilds Playlists
* 📃 Lyrics
* ⏰ Play in multiple servers at the same time
* ⚙️ 100% Promise-based

## Installation

**Node.js 16.9.0 or newer is required.**

```sh-session
$ npm install discord-player-music
$ yarn add discord-player-music
$ pnpm add discord-player-music
```

## Example Usage

```js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Player } = require('discord-player-music');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates
	],
    
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
		Partials.Reaction,
		Partials.User
	]
});

client.player = new Player(client);

client.on('ready', async () => {
  	return console.log('Client is ready!');
})

client.login('YOUR_BOT_TOKEN_HERE');
```

# Links

* Module Developer: [xyligan](https://github.com/xyligan-gp)
* Developer Discord: [♡ xүℓ[ι]gαη4εg ♡#9457](https://discord.com/users/533347075463577640)
* Documentation: [Click](https://dpm.js.org)
* NPM: [Click](https://www.npmjs.com/package/discord-player-music)
* GitHub: [Click](https://github.com/xyligan-gp/discord-player-music)
* Examples: [Click](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples)
* Support Server - [Click](https://discord.gg/zzbkvCcu2r)

<h1>♥ Thanks for using Discord Player Music ♥</h1>