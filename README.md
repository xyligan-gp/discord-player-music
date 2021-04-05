# Discord Player Music

[![Загрузок](https://img.shields.io/npm/dt/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)
[![Стабильная версия](https://img.shields.io/npm/v/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)

**Discord Player Music** - Easy module for playing music in your [discord.js](https://discord.js.org/) bot!

## Installation

```js
npm install discord-player-music@latest
```

## Starting

```js
const { Client } = require('discord.js');

const client = new Client();
const MusicPlayer = require('discord-player-music');
const player = new MusicPlayer(client);

client.on('ready', () => {
    console.log('Bot started!');
})

client.login('token'); //https://discord.com/developers/
```

# Module Methods

* `play()` - Method for videos playback.
```js
/**
 * @param {Discord.Guild} guild Discord Guild 
 * @param {Object} song Song Object 
 * @returns {Promise<Event>} Module Event
*/
player.play(guild, song);
```

* `searchVideo()` - Method for searching videos by user request.
```js
/**
 * @param {Discord.GuildMember} member Discord GuildMemver
 * @param {String} searchString User Request
 * @param {Discord.Message} message Discord Message
 * @returns {Promise<Array>} Array
*/
player.searchVideo(member, searchString, message);
```

* `getSongIndex()` - Method for getting song index.
```js
/**
 * @param {Array} tracksArray Tracks Array
 * @param {Discord.Message} message Discord Message
 * @returns {Promise<Number>} Number
*/
player.getSongIndex(tracksArray, message);
```

* `addSong()` - Method for adding a song to the server queue.
```js
/**
 * @param {Number} index Song Index
 * @param {Discord.Guild} guild Discord Guild
 * @param {Array} tracksArray Songs Array 
 * @param {Discord.TextChannel} textChannel Discord Text Channel 
 * @param {Discord.VoiceChannel} voiceChannel Discord Voice Channel 
 * @returns {Promise<Event>} Module Event
*/
player.addSong(index, guild, tracksArray, textChannel, voiceChannel);
```

* `skipSong()` - Method for skipping songs in the queue.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<object>} Object
*/
player.skipSong(guild);
```

* `getQueue()` - Method for getting a queue of server songs.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<Array>} Array
*/
player.getQueue(guild);
```

* `setLoopSong()` - Method for setting the current song to repet from the server queue.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<object>} Object
*/
player.setLoopSong(guild);
```

* `setLoopQueue()` - Method for setting to repeat server queue songs.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<object>} Object
*/
player.setLoopQueue(guild);
```

* `stopPlaying()` - Method for ending playing a queue of songs.
```js
/**
 * @param {Discord.Guild} guild Discord Guild 
 * @returns {Promise<boolean>} Boolean
*/
player.stopPlaying(guild);
```

* `pausePlaying()` - Method to pause song playback.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<boolean>} Boolean
*/
player.pausePlaying(guild);
```

* `resumePlaying()` - Method to restore playing songs.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<boolean>} Boolean
*/
player.resumePlaying(guild);
```

* `setVolume()` - Method for changing the playback volume of songs.
```js
/**
 * @param {Discord.Guild} guild 
 * @param {Number} volumeValue 
 * @returns {Promise<object>} Object
*/
player.setVolume(guild, volumeValue);
```

* `getCurrentSongInfo()` - Method for getting information about the current song.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<object>} Object
*/
player.getCurrentSongInfo(guild);
```

* `joinVoiceChannel()` - Method for joining your bot in voice channel.
```js
/**
 * @param {Discord.GuildMember} member Discord Guild Member 
 * @returns {Promise<object>} Object 
*/
player.joinVoiceChannel(member);
```

* `leaveVoiceChannel()` - Method for left your bot the voice channel.
```js
/**
 * @param {Discord.GuildMember} member Discord Guild Member 
 * @returns {Promise<object>} Object 
*/
player.leaveVoiceChannel(member);
```

* `createProgressBar()` - Method for creating progress bar.
```js
/**
 * @param {Discord.Guild} guild Discord Guild
 * @returns {Promise<string>} String
*/
player.createProgressBar(guild);
```

* `formatNumbers()` - Method for formatting numbers.
```js
/**
 * @param {Array} numbersArray Numbers Array
 * @returns {Array} Array
*/
player.formatNumbers(numbersArray);
```

* `initPlayer()` - Method for starting module.
```js
player.initPlayer();
```

# Module Events

* `playingSong` - Returns a song object that you can use. 
```js
player.on('playingSong', data => {
    let song = data.songs[0];

    let nowPlaying = new MessageEmbed()

    .setColor('RANDOM')
    .setTitle(':musical_note: | Song is playing!')
    .setThumbnail(song.thumbnail)
    .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`)

    data.textChannel.send(nowPlaying);
});
```

* `songAdded` - Returns an object of the added song that you can use. 
```js
player.on('songAdded', song => {
    let nowPlaying = new MessageEmbed()

    .setColor('RANDOM')
    .setTitle(':musical_note: | A song has been added to the queue!')
    .setThumbnail(song.thumbnail)
    .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`)

    song.textChannel.send(nowPlaying);
});
```

* `queueEnded` - Returns an object that you can use. 
```js
player.on('queueEnded', data => {
    data.textChannel.send(new MessageEmbed().setColor('RANDOM').setDescription(`Server queue ended!`));
});
```

* `playerError` - If there is any error in the module, then you can easily detect and fix it. 
```js
player.on('playerError', err => {
    console.log(err);
});
```

# Module Changelog
* ***Version 1.0.0***
  * Release module
* ***Version 1.0.1***
  * Code optimization
  * Fix methods `joinVoiceChannel` and `leaveVoiceChannel`
  * Add method `formatNumbers`
  * Fix bugs
  * Fix README.md

# Useful Links
* [npm](https://www.npmjs.com/package/discord-player-music)
* [GitHub](https://github.com/xyligan-gp/discord-player-music)
* [Examples](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* [Support Server](https://discord.gg/CfxyvqZrVm)
