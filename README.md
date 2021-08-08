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
<b>Discord Player Music is a powerful Node.js music module for your Discord.js bot that based on Promises and has a lot of features.</b>

## Installation

**Please note: Node.js 14.0.0 or newer is required.<br>
All types in brackets mean the type of what the method or event returns.**

Install [discord-player-music](https://www.npmjs.com/package/discord-player-music)
```JS
$ npm install discord-player-music
```

## Features

* Simple & easy to use 👍
* Beginner friendly 😄
* Audio filters 🎸
* Lyrics 📃
* Play in multiple servers at the same time ⏰
* 100% Promise-based ⚙️

## Module Managers
- 'CollectorsManager' - <b>Manager that enables module Collectors.</b>
- 'QueueManager' - <b>Manager that enables module Queue</b>
- 'UtilsManager' - <b>Manager that enables module Utils.</b>
- 'VoiceManager' - <b>Manager that enables module Voice.</b>

## Module Constructor Options
- 'options.searchResultsLimit' - <b>Property responsible for the number of results received when searching for songs.</b>
- 'options.synchronLoop' - <b>Property responsible for synchronization status 'loop.song' & 'loop.queue'.</b>
- 'options.defaultVolume' - <b>Property responsible for the default value of the playback volume.</b>

- 'options.collectorsConfig.autoAddingSongs' - <b>Property responsible for the automatic addition of songs in queue.</b>
- 'options.collectorsConfig.maxAttempts' - <b>Property responsible for the maximum number of attempts to get a valid value.</b>
- 'options.collectorsConfig.time' - <b>Property responsible for the amount of time that the collector will collect values.</b>

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
<b><a href="https://github.com/xyligan-gp/discord-player-music/tree/main/examples">Click here to see JavaScript examples.</a></b>

# Useful Links

* Module Developer: [xyligan](https://www.npmjs.com/~xyligan)
* Developer Discord: [♡ xүℓ[ι]gαη4εg ♡#9457](https://discord.com/users/533347075463577640)
* Documentation: [Click](https://dpm-docs.tk)
* NPM: [Click](https://www.npmjs.com/package/discord-player-music)
* GitHub: [Click](https://github.com/xyligan-gp/discord-player-music)
* Examples: [Click](https://github.com/xyligan-gp/discord-player-music/tree/main/examples)
* Support Server - [Click](https://discord.gg/zzbkvCcu2r)

<h1>Thanks for using Discord Player Music ♥</h1>