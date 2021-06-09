# Discord Player Music

[![Downloads](https://img.shields.io/npm/dt/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)
[![Stable Version](https://img.shields.io/npm/v/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)

**Discord Player Music** - Easy module for playing music in your [discord.js](https://npmjs.com/package/discord.js) bot!

## Install

**Please note: Node.js 14.0.0 or newer is required.<br>
All types in brackets mean the type of what the method or event returns.**

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
 * @param {Guild} guild Discord Guild 
 * @param {Object} song Song Object 
 * @returns {Promise<Event>} Returns the event of the module
*/
player.play(guild, song);
```

* `searchVideo()` - Method for searching videos by user request.
```js
/**
 * @param {GuildMember} member Discord Guild Member
 * @param {String} searchString Search String
 * @param {Message} message Discord Message
 * @returns {Promise<Array<Song>>} Returns a list of found songs 
*/
player.searchVideo(member, searchString, message);
```

* `getSongIndex()` - Method for getting song index.
```js
/**
 * @param {Array} tracksArray Tracks Array
 * @param {Message} message Discord Message
 * @returns {Promise<Number>} Returns the position of the song from the list
*/
player.getSongIndex(tracksArray, message);
```

* `addSong()` - Method for adding a song to the server queue.
```js
/**
 * @param {Number} index Song Index
 * @param {Guild} guild Discord Guild
 * @param {Array} tracksArray Songs Array 
 * @param {TextChannel} textChannel Discord Text Channel 
 * @param {VoiceChannel} voiceChannel Discord Voice Channel 
 * @returns {Promise<Event>} Returns the event of the module
*/
player.addSong(index, guild, tracksArray, textChannel, voiceChannel);
```

* `skipSong()` - Method for skipping songs in the queue.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: Boolean, song: Song }>} Returns an object with a skip status and a song object 
*/
player.skipSong(guild);
```

* `getQueue()` - Method for getting a queue of server songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<Array<Song>>} Returns an array of songs being played on the server
*/
player.getQueue(guild);
```

* `setLoopSong()` - Method for setting the current song to repet from the server queue.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: Boolean, song: Song }>} Returns the song repeat status and object
*/
player.setLoopSong(guild);
```

* `setLoopQueue()` - Method for setting to repeat server queue songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: Boolean, songs: Array<Song> }>} Returns the repeat status of the queue and its object
*/
player.setLoopQueue(guild);
```

* `stopPlaying()` - Method for ending playing a queue of songs.
```js
/**
 * @param {Guild} guild Discord Guild 
 * @returns {Promise<Boolean>} Returns true on success
*/
player.stopPlaying(guild);
```

* `pausePlaying()` - Method to pause song playback.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<Boolean>} Returns `true` on success
*/
player.pausePlaying(guild);
```

* `resumePlaying()` - Method to restore playing songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<Boolean>} Returns `true` on success
*/
player.resumePlaying(guild);
```

* `setVolume()` - Method for changing the playback volume of songs.
```js
/**
 * @param {Guild} guild 
 * @param {Number} volumeValue 
 * @returns {Promise<{status: Boolean, volume: Number}>} Returns the volume setting status and value
*/
player.setVolume(guild, volumeValue);
```

* `setFilter()` - Sets the filter for server queue songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @param {'3d' | 'bassboost' | 'echo' | 'flanger' | 'gate' |'haas' | 'karaoke' | 'nightcore' | 'reverse' | 'vaporwave' | 'mcompand' |'phaser' | 'tremolo' | 'surround' | 'earwax' | 'clear'} filter Filter Name
 * @returns {Promise<{ status: Boolean, filter: String, queue: Array<Song>}>} Returns installation status, filter name and server queue array.
*/
player.setFilter(guild, filter)
```

* `getCurrentSongInfo()` - Method for getting information about the current song.
```js
/**
 * Method for getting information about the current song
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ guildMap: GuildMap, songInfo: Song }>} Returns an object with information about the current song and server queue
*/
player.getCurrentSongInfo(guild);
```

* `joinVoiceChannel()` - Method for joining your bot in voice channel.
```js
/**
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<{ status: Boolean, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel
*/
player.joinVoiceChannel(member);
```

* `leaveVoiceChannel()` - Method for left your bot the voice channel.
```js
/**
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<{ status: true, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel
*/
player.leaveVoiceChannel(member);
```

* `createProgressBar()` - Method for creating progress bar.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ bar: string, percents: string }>} Returns an object with the progress bar data
*/
player.createProgressBar(guild);
```

* `getFilters()` - Method for getting all filters of a module.
```js
/**
 * @returns {Promise<Array<Filters>>} Returns an array of all filters in the module.
*/
player.getFilters()
```

* `formatNumbers()` - Method for formatting numbers.
```js
/**
 * @param {Array} numbersArray Numbers Array
 * @returns {Array<String>} Returns an array with formatted numbers
*/
player.formatNumbers(numbersArray);
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
    .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}>`)

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
    .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}>`)

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
player.on('playerError', async data => {
    if(!data.textChannel) return console.log(data.error);
    return await data.textChannel.send(data.error.message);
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
* ***Version 1.0.2***
  * Code optimization
  * Fixed bug with repeating song/queue
  * Improving the quality of playing songs
  * Added filter system. Method `setFilter()`
  * Changing the returned data by some methods and events
  * Added the `getGuildMap()` method to get the server queue object
* ***Version 1.0.3***
  * Code optimization
  * Fix caught some bugs
  * Fixed minor bugs
  * Rewrite README.md
  * Fixed events
* ***Versions 1.0.4 - 1.0.5***
  * Update versions all dependencies
  * Fix README.md
* ***Version 1.0.6***
  * Fix module typings
  * Fix minor bugs
  * Added the `getFilters()` method to get arrays with player filters
  * Fix README.md

# Useful Links

* [npm](https://www.npmjs.com/package/discord-player-music)
* [GitHub](https://github.com/xyligan-gp/discord-player-music)
* [Examples](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* [Support Server](https://discord.gg/zzbkvCcu2r)

If you found a bug, please send it in Discord to ♡ xүℓ[ι]gαη4εg ♡#9457.<br>
If you have any questions or need help, join the [Support Server](https://discord.gg/zzbkvCcu2r).<br>
Module Created by [xyligan](https://www.npmjs.com/~xyligan).

<h1>Thanks for using Discord Player Music ♥</h1>
