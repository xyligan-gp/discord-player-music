# Discord Player Music

[![Загрузок](https://img.shields.io/npm/dt/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)
[![Стабильная версия](https://img.shields.io/npm/v/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)

**Discord Player Music** - Easy module for playing music in your [discord.js](https://discord.js.org/) bot!

## Installation

```js
npm i discord-player-music
```

## Starting

```js
const { Client } = require('discord.js');

const client = new Client();
const MusicPlayer = require('discord-player-music');
const music = new MusicPlayer(client);

client.on('ready', () => {
    console.log('Bot started!');
})

client.login('token'); //https://discord.com/developers/
```

# Module Methods

* `play()` - Method for videos playback.
```js
/*
 * @param {Discord.Guild} guild Discord Guild
 * @param {Object} song Song Object
 * @returns {Promise<Event | Error>} Module Event
*/
music.play(guild, song);
```
* `searchVideo()` - Method for searching videos by user request.
```js
/*
 * @param {Discord.GuildMember} member Discord GuildMemver
 * @param {String} searchString User Request
 * @param {Discord.Message} message Discord Message
 * @returns {Promise<Array | Error>} Array | Error
*/
music.searchVideo(member, searchString, message)
```
* `getSongIndex()` - Method for getting song index.
```js
/*
 * @param {Array} tracksArray Tracks Array
 * @param {Discord.Message} message Discord Message
*/
music.getSongIndex(tracksArray, message);
```
* `addSong()` - Method for adding a song to the server queue.
```js
/**
 * @param {Number} index Song Index
 * @param {Guild} guild Discord Guild
 * @param {Array} tracksArray Songs Array 
 * @param {TextChannel} textChannel Discord Text Channel 
 * @param {VoiceChannel} voiceChannel Discord Voice Channel 
 * @returns {Event | Error} Event | Error
*/
music.addSong(index, guild, tracksArray, textChannel, voiceChannel);
```
* `skipSong()` - Method for skipping songs in the queue.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.skipSong(guild)
```
* `getQueue()` - Method for getting a queue of server songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<Array | Error>} Array | Error
*/
music.getQueue(guild)
```
* `setLoopSong()` - Method for setting the current song to repet from the server queue.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.setLoopSong(guild);
```
* `setLoopQueue()` - Method for setting to repeat server queue songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.setLoopQueue(guild);
```
* `stopPlaying()` - Method for ending playing a queue of songs.
```js
/**
 * @param {Guild} guild Discord Guild 
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.stopPlaying(guild);
```
* `pausePlaying()` - Method to pause song playback.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.pausePlaying(guild);
```
* `resumePlaying()` - Method to restore playing songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<boolean | Error>} Boolean | Error
*/
music.resumePlaying(guild);
```
* `setVolume()` - Method for changing the playback volume of songs.
```js
/**
 * @param {Guild} guild 
 * @param {Number} volumeValue 
 * @returns {Promise<object | Error>} Object | Error
*/
music.setVolume(guild, volumeValue);
```
* `getCurrentSongInfo()` - Method for getting information about the current song.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<object | Error>} Object | Error
*/
music.getCurrentSongInfo(guild);
```
* `joinVoiceChannel()` - Method for joining your bot in voice channel.
```js
/**
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<boolean | Error>} Boolean | Error 
*/
music.joinVoiceChannel(member);
```
* `leaveVoiceChannel()` - Method for left your bot the voice channel.
```js
/**
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<boolean | Error>} Boolean | Error 
*/
music.leaveVoiceChannel(member);
```
* `createProgressBar()` - Method for creating progress bar.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<string | Error >} String | Error
*/
music.createProgressBar(guild);
```
* `initPlayer()` - Method for starting module.
```js
music.initPlayer();
```

# Module Events

* `playingSong` - Returns a song object that you can use to play. 
```js
music.on('playingSong', data => {
    console.log(data);
    data.textChannel.send(`Song is playing!\n\Song Name: ${data.songs[0].title}\Song Url: ${data.songs[0].url}`);
})
```
* `queueEnded` - Returns an object that you can use. 
```js
music.on('queueEnded', data => {
    console.log(data);
    data.textChannel.send('Queue ended!');
})
```
* `songAdded` - Returns an object of the added song that you can use. 
```js
music.on('songAdded', data => {
    console.log(data);
    data.textChannel.send(`A song has been added to the queue!\n\nSong Name: ${data.title}\nSong Url: ${data.url}`);
})
```
* `playerError` - If there is any error in the module, then you can easily detect and fix it. 
```js
music.on('playerError', error => {
    console.log(err);
})
```

# Module Changelog
* ***Version 1.0.0***
  * Release module

# Useful Links
* [npm](https://www.npmjs.com/package/discord-player-music)
* [GitHub](https://github.com/xyligan-gp/discord-player-music)
* [Examples](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* [Support Server](https://discord.gg/CfxyvqZrVm)
