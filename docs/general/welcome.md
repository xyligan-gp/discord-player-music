<div align="center">
	<h1>Welcome to the 'discord-player-music' page!</h1>
	<br />
	<p>
		<a href="https://dpm.js.org"><img src="https://i.imgur.com/4Pk9WlS.gif" width="546" alt="DPM Main Image" /></a>
	</p>
	<br/>
	<p>
		<a href="https://discord.gg/zzbkvCcu2r"><img src="https://img.shields.io/discord/827221018879328298?color=5865F2&logo=discord&logoColor=white" alt="Support Server" /></a>
		<a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/dt/discord-player-music.png?maxAge=3600" alt="NPM downloads" /></a>
		<a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/v/discord-player-music.png?maxAge=3600" alt="NPM page" /></a>
	</p>
</div>

## About

**Discord Player Music is a powerful [Node.js](https://nodejs.org) music module for your Discord.js bot that based on Promises and has a lot of features.**

* 👍 Simple & easy to use
* 😄 Beginner friendly
* 🎸 Audio filters
* 📃 Lyrics
* 📂 Multiple servers

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

client.player.on('ready', async () => {
	return console.log('Player is ready!');
})

client.login('YOUR_CLIENT_TOKEN_HERE');
```

## Links

* NPM: [Open](https://www.npmjs.com/package/discord-player-music)
* GitHub: [Open](https://github.com/xyligan-gp/discord-player-music)
* Examples: [See](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples)
* Documentation: [Open](https://dpm.js.org)

* Module Developer: [xyligan](https://github.com/xyligan-gp)
* Developer Discord: [♡ xүℓ[ι]gαη4εg ♡#9457](https://discord.com/users/533347075463577640)
* Support Server: [Join xyligan development](https://discord.gg/zzbkvCcu2r)

<center><h1>♥ Thanks for using Discord Player Music ♥</h1></center>