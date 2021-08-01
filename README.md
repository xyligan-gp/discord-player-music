<div align="center">
  <br />
  <p>
    <a href="https://dpm-docs.tk"><img src="https://dpm-docs.tk/static/dpm.png" width="546" alt="discord-player-music" /></a>
  </p>
  <br/>
  <p>
    <a href="https://discord.gg/zzbkvCcu2r"><img src="https://img.shields.io/discord/827221018879328298?color=5865F2&logo=discord&logoColor=white" alt="Support server" /></a>
    <a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/v/discord-player-music.png?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/dt/discord-player-music.png?maxAge=3600" alt="NPM downloads" /></a>
  </p>
</div>

## Welcome
<b>Welcome! This 'discord-player-music' module!</b><br>
<b>This is easy module for playing music in your Discord bot.</b>

## Installation

**Please note: Node.js 14.0.0 or newer is required.<br>
All types in brackets mean the type of what the method or event returns.**

Install [discord-player-music dev](https://github.com/xyligan-gp/discord-player-music/tree/dev)
```JS
$ npm install xyligan-gp/discord-player-music#dev
```

## Warning
If you get the error `Cannot play audio as no valid encryption package is installed`, be sure to install 1 of the following libraries: `sodium`, `libsodium-wrappers` or `tweetnacl`!

## Features

* Simple & easy to use 👍
* Beginner friendly 😄
* Audio filters 🎸
* Lyrics 📃
* Play in multiple servers at the same time ⏰
* TypeScript Support 🔑
* Flexible and customizable 🛠️
* 100% Promise-based ⚙️

## Module Managers
- [✔] 'QueueManager' - <b>Manager that enables Queue System</b>
- [❌] 'UtilsManager' - <b>Manager that enables module Utils.</b> [*Development process*]
- [☑] 'VoiceManager' - <b>Manager that enables Voice System.</b> [*BETA Testing process*]

## Module Constructor Options
- 'options.searchResultsLimit' - <b>Property responsible for the number of results received when searching for songs.</b>
- 'options.searchCollector' - <b>Property responsible for the status of a custom module collector.</b>

- 'options.searchCollectorConfig.type' - <b>Property responsible for the custom collector type of the module. Available types: `message` &` reaction`.</b>
- 'options.searchCollectorConfig.count' - <b>Property responsible for the amount of all data for the module collector (taken from `options.searchResultsLimit`).</b>

## Quick Initialization Example

```JS
const Discord = require('discord.js');

const client = new Discord.Client();
const Player = require('discord-player-music');
const player = new Player(client);

client.on('ready', () => {
  console.log('Bot started!');
})

client.login('YOUR_BOT_TOKEN_HERE');
```

## Examples
<b><a href="https://github.com/xyligan-gp/discord-player-music/blob/main/example/">Click here to see JavaScript examples.</a></b>

# Useful Links

* Module Developer: [xyligan](https://www.npmjs.com/~xyligan)
* Developer Discord: [♡ xүℓ[ι]gαη4εg ♡#9457](https://discord.com/users/533347075463577640)
* Documentation: [Click](https://dpm-docs.tk)
* NPM: [Click](https://www.npmjs.com/package/discord-player-music)
* GitHub: [Click](https://github.com/xyligan-gp/discord-player-music)
* Examples: [Click](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* Support Server - [Click](https://discord.gg/zzbkvCcu2r)

<h1>Thanks for using Discord Player Music ♥</h1>