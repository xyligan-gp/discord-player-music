# Discord Player Music

[![Downloads](https://img.shields.io/npm/dt/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)
[![Stable Version](https://img.shields.io/npm/v/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)

**Discord Player Music** - Easy module for playing music in your [discord.js](https://npmjs.com/package/discord.js) bot!

## Installation

**Please note: Node.js 14.0.0 or newer is required.<br>
All types in brackets mean the type of what the method or event returns.**

Install [discord-player-music](https://www.npmjs.com/package/discord-player-music)
```JS
$ npm install discord-player-music
```

Install [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)
```JS
$ npm install ffmpeg-static
```

Install [@discordjs/opus](https://www.npmjs.com/package/@discordjs/opus)
```JS
$ npm install @discordjs/opus
```

## Features

* Simple & easy to use 👍
* Beginner friendly 😄
* Audio filters 🎸
* Lyrics 📃
* Play in multiple servers at the same time ⏰

## [Documentation](https://dpm-docs.tk)

## Getting Started

```JS
const Discord = require('discord.js');

const client = new Discord.Client();
const MusicPlayer = require('discord-player-music');
const player = new MusicPlayer(client);

client.on('ready', () => {
  console.log('Bot started!');
})

client.login('YOUR_BOT_TOKEN_HERE'); //https://discord.com/developers/
```

# Module Events

* `playingSong` - Returns a song object that you can use. 
```JS
player.on('playingSong', data => {
  const song = data.songs[0];

  const nowPlaying = new Discord.MessageEmbed()

  .setColor('RANDOM')
  .setTitle(':musical_note: | Song is playing!')
  .setThumbnail(song.thumbnail)
  .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}>`)
  .setFooter(`Requested: ${song.requestedBy}`, song.requestedBy.displayAvatarURL({ dynamic: true }));

  return data.textChannel.send(nowPlaying);
});
```

* `songAdded` - Returns an object of the added song that you can use. 
```JS
player.on('songAdded', song => {
  const nowPlaying = new Discord.MessageEmbed()

  .setColor('RANDOM')
  .setTitle(':musical_note: | A song has been added to the queue!')
  .setThumbnail(song.thumbnail)
  .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}>`)
  .setFooter(`Requested: ${song.requestedBy}`, song.requestedBy.displayAvatarURL({ dynamic: true }));

  return song.textChannel.send(nowPlaying);
});
```

* `queueEnded` - Returns an object that you can use. 
```JS
player.on('queueEnded', data => {
  return data.textChannel.send(new Discord.MessageEmbed().setColor('RANDOM').setDescription(`Server queue ended!`));
});
```

* `playerError` - If there is any error in the module, then you can easily detect and fix it. 
```JS
player.on('playerError', data => {
  if(!data.textChannel) return console.log(data.error);

  return data.textChannel.send(data.error.message);
});
```

## Bot Example

```JS
const Discord = require('discord.js');
const Player = require('discord-player-music');
const client = new Discord.Client();
const prefix = '!';

client.player = new Player(client);

client.on('ready', () => {
  console.log(`${client.user.tag} ready!`);
});

client.on('message', async message => {
  if(!message.content.startsWith(prefix)) return;

  const messageArray = message.content.split(' ');
  const command = messageArray[0];
  const args = messageArray.slice(1);

  if(command === `${prefix}play`) {
    const query = args.join(' ');
    if(!query) return console.log('Missing Arguments!');

    client.player.searchSong(message.member, query, message.channel).then(data => {
      if(!data[0].index) return;

      return message.channel.send(data.map(song => `[${song.index}] - **${song.title}**`));
    })
  }

  if(command === `${prefix}queue`) {
    client.player.getQueue(message.guild).then(data => {
      return message.channel.send(data.map((song, index) => `\`[${index + 1}]\` **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
    }).catch(error => {
      return console.log(error);
    })
  }

  if(command === `${prefix}stop`) {
    client.player.stopPlaying(message.guild).then(status => {
      return message.channel.send('Playing queue stopped!');
    }).catch(error => {
      return console.log(error);
    })
  }
});
```

# Useful Links

* [Documentation](https://dpm-docs.tk)
* [npm](https://www.npmjs.com/package/discord-player-music)
* [GitHub](https://github.com/xyligan-gp/discord-player-music)
* [Examples](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* [Support Server](https://discord.gg/zzbkvCcu2r)

If you found a bug, please send it in Discord to ♡ xүℓ[ι]gαη4εg ♡#9457.<br>
If you have any questions or need help, join the [Support Server](https://discord.gg/zzbkvCcu2r).<br>
Module Created by [xyligan](https://www.npmjs.com/~xyligan).

<h1>Thanks for using Discord Player Music ♥</h1>