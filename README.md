# Discord Player Music

[![Загрузок](https://img.shields.io/npm/dt/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)
[![Стабильная версия](https://img.shields.io/npm/v/discord-player-music?style=for-the-badge)](https://www.npmjs.com/package/discord-player-music)

**Discord Player Music** - Easy module for playing music in your [discord.js](https://discord.js.org/) bot!

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
 * @param {Discord.Guild} guild Discord Guild 
 * @param {Object} song Song Object 
 * @returns {Promise<Event>} Module Event
*/
player.play(guild, song);
```

* `searchVideo()` - Method for searching videos by user request.
```js
/**
 * @param {GuildMember} member Discord Guild Member
 * @param {String} searchString Search String
 * @param {Message} message Discord Message
 * @returns {Promise<[{
                    index: Number,
                    searchType: String,
                    title: String,
                    url: String,
                    thumbnail: String,
                    author: String,
                    textChannel: TextChannel,
                    voiceChannel: VoiceChannel,
                    requestedBy: GuildMember,
                    duration: {
                        hours: Number,
                        minutes: Number,
                        seconds: Number
                    }
                }]>} Array 
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
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: true, song: ({
                    searchType: String,
                    title: String,
                    url: String,
                    thumbnail: String,
                    author: String,
                    textChannel: TextChannel,
                    voiceChannel: VoiceChannel,
                    requestedBy: GuildMember,
                    duration: {
                        hours: Number,
                        minutes: Number,
                        seconds: Number
                    }
                })}>} Object 
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
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: Boolean, song: ({
                    searchType: String,
                    title: String,
                    url: String,
                    thumbnail: String,
                    author: String,
                    textChannel: TextChannel,
                    voiceChannel: VoiceChannel,
                    requestedBy: GuildMember,
                    duration: {
                        hours: Number,
                        minutes: Number,
                        seconds: Number
                    }
                }) }>} Object
*/
player.setLoopSong(guild);
```

* `setLoopQueue()` - Method for setting to repeat server queue songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{ status: Boolean, song: ({
                    searchType: String,
                    title: String,
                    url: String,
                    thumbnail: String,
                    author: String,
                    textChannel: TextChannel,
                    voiceChannel: VoiceChannel,
                    requestedBy: GuildMember,
                    duration: {
                        hours: Number,
                        minutes: Number,
                        seconds: Number
                    }
                }) }> Object
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
 * @param {Guild} guild 
 * @param {Number} volumeValue 
 * @returns {Promise<{status: true, volume: Number}>} Object
*/
player.setVolume(guild, volumeValue);
```

* `setFilter()` - Sets the filter for server queue songs.
```js
/**
 * @param {Guild} guild Discord Guild
 * @param {'3d' | 'bassboost' | 'echo' | 'flanger' | 'gate' |'haas' | 'karaoke' | 'nightcore' | 'reverse' | 'vaporwave' | 'mcompand' |'phaser' | 'tremolo' | 'surround' | 'earwax' | 'clear'} filter Filter Name
 * @returns {Promise<{ status: true, filter: '3d' | 'bassboost' | 'echo' | 'flanger' | 'gate' |'haas' | 'karaoke' | 'nightcore' | 'reverse' | 'vaporwave' | 'mcompand' |'phaser' | 'tremolo' | 'surround' | 'earwax' | 'clear', queue: data}>}
*/
player.setFilter(guild, filter)
```

* `getCurrentSongInfo()` - Method for getting information about the current song.
```js
/**
 * Method for getting information about the current song
 * @param {Guild} guild Discord Guild
 * @returns {Promise<{
                    guildMap: object,
                    songInfo: {
                        searchType: String,
                        title: String,
                        url: String,
                        thumbnail: String,
                        author: String,
                        textChannel: TextChannel,
                        voiceChannel: VoiceChannel,
                        requestedBy: GuildMember,
                        duration: {
                            hours: Number,
                            minutes: Number,
                            seconds: Number
                        }
                    }
                }>} Object
*/
player.getCurrentSongInfo(guild);
```

* `joinVoiceChannel()` - Method for joining your bot in voice channel.
```js
/**
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<{status: true, voiceChannel: voiceChannel}>} Object 
*/
player.joinVoiceChannel(member);
```

* `leaveVoiceChannel()` - Method for left your bot the voice channel.
```js
 * @param {GuildMember} member Discord Guild Member 
 * @returns {Promise<{status: true, voiceChannel: voiceChannel}>} Object
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
* ***Version 1.0.2***
  * Code optimization
  * Fixed bug with repeating song/queue
  * Improving the quality of playing songs
  * Added filter system. Method `setFilter()`
  * Changing the returned data by some methods and events
  * Added the `getGuildMap()` method to get the server queue object

# Useful Links

* [npm](https://www.npmjs.com/package/discord-player-music)
* [GitHub](https://github.com/xyligan-gp/discord-player-music)
* [Examples](https://github.com/xyligan-gp/discord-player-music/blob/main/example/)
* [Support Server](https://discord.gg/zzbkvCcu2r)

If you found a bug, please send it in Discord to ♡ xүℓ[ι]gαη4εg ♡#9457.<br>
If you have any questions or need help, join the [Support Server](https://discord.gg/zzbkvCcu2r).<br>
Module Created by [xyligan](https://www.npmjs.com/~xyligan).

<h1>Thanks for using Discord Player Music ♥</h1>
