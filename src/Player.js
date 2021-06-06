const { EventEmitter } = require('events'), { Client, Guild, GuildMember, TextChannel, VoiceChannel, Message } = require('discord.js'), ytdl = require('./modules/dpm-ytdl.js'), ytSearch = require('yt-search'), { Readable } = require('stream'),
MusicPlayerError = require('discord-player-music/src/MusicPlayerError.js'), PlayerErrors = require('discord-player-music/src/PlayerErrors.js'), { Song, GuildMap, Filters } = require('discord-player-music/structures/Player.js');

module.exports = class MusicPlayer extends EventEmitter {

    /**
     * MusicPlayer Constructor
     * @param {Client} client Discord Client 
    */
    constructor(client) {
        super();

        if (!client) return new MusicPlayerError(PlayerErrors.clientNotRequired);

        /**
         * Discord Client
        */
        this.client = client;

        /**
         * Player Queue Manager
        */
        this.queue = new Map();

        /**
         * Module Manager Status
        */
        this.ready = false;

        this.initPlayer();
    }

    /**
     * Method for playing songs.
     * @param {Guild} guild Discord Guild 
     * @param {Song} song Song Object 
     * @returns {Promise<Event>} Returns the event of the module.
    */
    play(guild, song) {
        return new Promise(async (resolve, reject) => {
            const serverQueue = await this.queue.get(guild.id);
            if (!song) {
                if (!serverQueue.songs) return;
                serverQueue.voiceChannel.leave();
                return this.queue.delete(guild.id);
            }

            let stream = await this.createStream(guild);

            const dispatcher = serverQueue.connection
                .play(stream, { type: 'opus' })
                .on("finish", () => {
                    if (serverQueue.songs.length < 1) return this.emit('queueEnded', serverQueue);
                    if (serverQueue.loop) {
                        this.play(guild, serverQueue.songs[0]);
                    } else if (serverQueue.queueLoop) {
                        let lastsong = serverQueue.songs.shift();

                        serverQueue.songs.push(lastsong);
                        this.play(guild, serverQueue.songs[0]);
                    } else {
                        serverQueue.songs.shift();
                        this.play(guild, serverQueue.songs[0]);

                        if (serverQueue.songs.length < 1) {
                            serverQueue.voiceChannel.leave();
                            this.queue.delete(guild.id);

                            return this.emit('queueEnded', serverQueue);
                        } else {
                        }
                    }
                })
                .on("error", error => {
                    console.log(error.message);
                    serverQueue.voiceChannel.leave();
                    this.queue.delete(guild.id);
                    return this.emit('playerError', { textChannel: null, message: null, method: 'play', error: error });
                });
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
            this.emit('playingSong', this.queue.get(guild.id));
        })
    }
    /**
     * Method to search for songs by user request.
     * @param {GuildMember} member Discord GuildMember
     * @param {String} searchString Search String
     * @param {Message} message Discord Message
     * @returns {Promise<Array<Song>>} Returns a list of found songs.
    */
    searchVideo(member, searchString, message) {
        return new Promise(async (resolve, reject) => {
            let song = {}

            if (!searchString) return reject(new MusicPlayerError(PlayerErrors.searchVideo.userRequestNotFound));

            const voiceChannel = member.voice.channel;
            if (!voiceChannel) return reject(new MusicPlayerError(PlayerErrors.voiceChannelNotFound));

            const permissions = voiceChannel.permissionsFor(this.client.user);
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) return reject(new MusicPlayerError(PlayerErrors.permissionsNotFound.replace('{perms}', `'CONNECT' | 'SPEAK'`)));

            try {
                if (searchString.includes('https://')) {
                    const songInfo = await ytdl.getInfo(searchString);

                    song = ({
                        searchType: 'search#url',
                        title: songInfo.videoDetails.title,
                        url: songInfo.videoDetails.video_url,
                        thumbnail: songInfo.videoDetails.thumbnails[0].url,
                        author: songInfo.videoDetails.author.name,
                        textChannel: message.channel,
                        voiceChannel: message.member.voice.channel,
                        requestedBy: message.author,

                        duration: {
                            hours: Math.floor(songInfo.videoDetails.lengthSeconds / 3600),
                            minutes: Math.floor(songInfo.videoDetails.lengthSeconds / 60 % 60),
                            seconds: Math.floor(songInfo.videoDetails.lengthSeconds % 60)
                        }
                    })

                    resolve([song]);
                    return this.addSong(1, member.guild, [song], message.channel, voiceChannel);
                } else {
                    const videoResult = await ytSearch(searchString);

                    var tracksArray = [];

                    for (let i = 0; i < 10; i++) {
                        tracksArray.push({
                            index: i + 1,
                            searchType: 'search#name',
                            title: videoResult.videos[i].title,
                            url: videoResult.videos[i].url,
                            thumbnail: videoResult.videos[i].thumbnail,
                            author: videoResult.videos[i].author.name,
                            textChannel: message.channel,
                            voiceChannel: message.member.voice.channel,
                            requestedBy: message.author,

                            duration: {
                                hours: Math.floor(videoResult.videos[i].seconds / 3600),
                                minutes: Math.floor(videoResult.videos[i].seconds / 60 % 60),
                                seconds: Math.floor(videoResult.videos[i].seconds % 60)
                            }
                        })
                    }

                    resolve(tracksArray)
                    await this.getSongIndex(tracksArray, message);
                }
            } catch (error) {
                this.emit('playerError', { textChannel: message.channel, message: message, method: 'searchVideo', error: error });
            }
        })
    }

    /**
     * Method for getting song index.
     * @param {Array} tracksArray Songs Array
     * @param {Message} message Discord Message
     * @returns {Promise<Number>} Returns the position of the song from the list.
    */
    getSongIndex(tracksArray, message) {
        return new Promise(async (resolve, reject) => {
            try {
                const filter = msg => msg.author.id === message.author.id;
                let collector = message.channel.createMessageCollector(filter, { time: 30000 });

                collector.on('collect', async msg => {
                    if (!isNaN(msg.content)) {
                        let number = Math.floor(msg.content);
                        if (number < 1 || number > 10) {
                            await collector.stop();
                            return this.emit('playerError', { textChannel: message.channel, message: message, method: 'searchVideo', error: new MusicPlayerError(PlayerErrors.getSongIndex.invalidTypeValue) })
                        }

                        await collector.stop();
                        resolve(number);
                        return this.addSong(number, message.guild, tracksArray, message.channel, message.member.voice.channel);
                    } else {
                        await collector.stop();
                        return this.emit('playerError', { textChannel: message.channel, message: message, method: 'searchVideo', error: new MusicPlayerError(PlayerErrors.getSongIndex.minMaxValue) })
                    }
                })
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for adding a song to the server queue.
     * @param {Number} index Song Index
     * @param {Guild} guild Discord Guild
     * @param {Array} tracksArray Songs Array 
     * @param {TextChannel} textChannel Discord TextChannel 
     * @param {VoiceChannel} voiceChannel Discord VoiceChannel 
     * @returns {Promise<Event>} Returns the event of the module.
    */
    addSong(index, guild, tracksArray, textChannel, voiceChannel) {
        return new Promise(async (resolve, reject) => {
            try {
                let connection = await voiceChannel.join()
                let serverQueue = await this.queue.get(guild.id);
                let songObject = tracksArray[index - 1];

                let duration = this.formatNumbers([songObject.duration.hours, songObject.duration.minutes, songObject.duration.seconds]);

                songObject.duration = {
                    hours: duration[0],
                    minutes: duration[1],
                    seconds: duration[2]
                }

                if (!serverQueue) {
                    const queueConstruct = {
                        textChannel: textChannel,
                        voiceChannel: voiceChannel,
                        connection: connection,
                        songs: [],
                        volume: 5,
                        loop: false,
                        queueLoop: false,
                        playing: true,
                        filter: null
                    };
                    await queueConstruct.songs.push(songObject);
                    await this.queue.set(textChannel.guild.id, queueConstruct);

                    await this.play(textChannel.guild, songObject);
                    this.emit('playingSong', this.queue.get(guild.id));
                } else {
                    await serverQueue.songs.push(songObject);

                    return this.emit('songAdded', songObject);
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for skipping songs in the queue.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, song: Song }>} Returns an object with a skip status and a song object. 
    */
    skipSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                if (serverQueue.songs.length < 2) {
                    serverQueue.songs = [];
                    serverQueue.voiceChannel.leave();
                    this.queue.delete(guild.id);

                    resolve({ status: true, song: null });
                }

                if (serverQueue.loop) {
                    let song = serverQueue.songs.shift();
                    serverQueue.songs.push(song);
                    serverQueue.connection.dispatcher.end();
                } else {
                    serverQueue.connection.dispatcher.end();
                }

                resolve({ status: true, song: serverQueue.songs[1] || null });
            } catch (error) {
                reject(error);
            }
        })
    }
    /**
     * Method for getting a queue of server songs.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Array<Song>>} Returns an array of songs being played on the server.
    */
    getQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                return resolve(serverQueue.songs);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting the current song to repet from the server queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, song: Song }>} Returns the song repeat status and object.
    */
    setLoopSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                serverQueue.loop = !serverQueue.loop;
                if (serverQueue.queueLoop) serverQueue.queueLoop = !serverQueue.queueLoop;

                return resolve({ status: serverQueue.loop, song: serverQueue.songs[0] });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting to repeat server queue songs.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, songs: Array<Song> }>} Returns the repeat status of the queue and its object.
    */
    setLoopQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                serverQueue.queueLoop = !serverQueue.queueLoop;
                if (serverQueue.loop) serverQueue.loop = !serverQueue.loop;

                return resolve({ status: serverQueue.queueLoop, songs: serverQueue.songs });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for ending playing a queue of songs.
     * @param {Guild} guild Discord Guild 
     * @returns {Promise<Boolean>} Returns true on success.
    */
    stopPlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                serverQueue.songs = [];
                serverQueue.voiceChannel.leave();
                this.queue.delete(guild.id);

                return resolve(true);
            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Method to pause song playback.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Boolean>} Returns `true` on success.
    */
    pausePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                if (serverQueue && serverQueue.playing) {
                    serverQueue.playing = false;
                    serverQueue.connection.dispatcher.pause();
                    resolve(true);
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method to restore playing songs.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Boolean>} Returns `true` on success.
    */
    resumePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                if (serverQueue && !serverQueue.playing) {
                    serverQueue.playing = true;
                    serverQueue.connection.dispatcher.resume();
                    resolve(true);
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for changing the playback volume of songs.
     * @param {Guild} guild Discord Guild
     * @param {Number} volumeValue Volume Value
     * @returns {Promise<{status: Boolean, volume: Number}>} Returns the volume setting status and value.
    */
    setVolume(guild, volumeValue) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                if (isNaN(volumeValue)) return reject(new MusicPlayerError(PlayerErrors.setVolume.invalidTypeValue));
                let volume = Number(volumeValue);

                if (volume < 0.1) return reject(new MusicPlayerError(PlayerErrors.setVolume.minMaxValue));

                serverQueue.connection.dispatcher.setVolumeLogarithmic(volume / 5);
                serverQueue.volume = volume;

                resolve({ status: true, volume: volume });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting information about the current song.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ guildMap: GuildMap, songInfo: Song }>} Returns an object with information about the current song and server queue.
    */
    getCurrentSongInfo(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                let songInfo = serverQueue.songs[0];

                let songObject = ({
                    searchType: String(songInfo.searchType),
                    title: String(songInfo.title),
                    url: String(songInfo.url),
                    thumbnail: String(songInfo.thumbnail),
                    author: String(songInfo.author),
                    textChannel: songInfo.textChannel,
                    voiceChannel: songInfo.voiceChannel,
                    requestedBy: songInfo.requestedBy,

                    duration: {
                        hours: songInfo.duration.hours,
                        minutes: songInfo.duration.minutes,
                        seconds: songInfo.duration.seconds
                    }
                })

                resolve({ guildMap: serverQueue, songInfo: songObject });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for joining your bot in voice channel.
     * @param {GuildMember} member Discord GuildMember
     * @returns {Promise<{ status: Boolean, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel.
    */
    joinVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!member.voice.channel) return reject(new MusicPlayerError());

                let usersCollection = member.voice.channel.members;
                if (usersCollection.get(this.client.user.id)) return reject(new MusicPlayerError(PlayerErrors.clientInVoiceChannel));

                await member.voice.channel.join();
                resolve({ status: true, voiceChannel: member.voice.channel });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for left your bot the voice channel.
     * @param {GuildMember} member Discord GuildMember 
     * @returns {Promise<{ status: true, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel.
    */
    leaveVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!member.voice.channel) return reject(new MusicPlayerError(PlayerErrors.voiceChannelNotFound));

                let usersCollection = member.voice.channel.members.each(user => user.id === this.client.user.id);
                if (!usersCollection.get(this.client.user.id)) return reject(new MusicPlayerError(PlayerErrors.clientNotInVoiceChannel));

                await member.voice.channel.leave();
                resolve({ status: true, voiceChannel: member.voice.channel });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for creating progress bar.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ bar: string, percents: string }>} Returns an object with the progress bar data.
    */
    createProgressBar(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                if (!serverQueue.connection.dispatcher) return resolve({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' })

                const seconds = Math.floor((Number(serverQueue.songs[0].duration.hours) * 3600) + (Number(serverQueue.songs[0].duration.minutes) * 60) + Number(serverQueue.songs[0].duration.seconds));
                const total = Math.floor(seconds * 1000);
                const current = Math.floor(serverQueue.connection.dispatcher.streamTime || 0);
                const size = 11;
                const line = '▬';
                const slider = '🔘';

                if (!total) return resolve(`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (!current) return resolve(`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(total)) return resolve(`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(current)) return resolve(`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(size)) return resolve(`🔘▬▬▬▬▬▬▬▬▬  [0%]`);
                if (current > total) {
                    const bar = line.repeat(size + 2);
                    const percentage = (current / total) * 100;
                    return [bar, percentage];
                } else {
                    const percentage = current / total;
                    const progress = Math.round((size * percentage));
                    const emptyProgress = size - progress;
                    const progressText = line.repeat(progress).replace(/.$/, slider);
                    const emptyProgressText = line.repeat(emptyProgress);
                    const bar = progressText + emptyProgressText;
                    const calculated = Math.floor(percentage * 100);
                    if (calculated < 5) {
                        resolve({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: `${calculated}%` });
                    } else {
                        resolve({ bar: bar, percents: `${calculated}%` });
                    }
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Sets the filter for server queue songs.
     * @param {Guild} guild Discord Guild
     * @param {'3d' | 'bassboost' | 'echo' | 'flanger' | 'gate' |'haas' | 'karaoke' | 'nightcore' | 'reverse' | 'vaporwave' | 'mcompand' |'phaser' | 'tremolo' | 'surround' | 'earwax' | 'clear'} filter Filter Name
     * @returns {Promise<{ status: Boolean, filter: String, queue: Array<Song>}>} Returns installation status, filter name and server queue array.
    */
    setFilter(guild, filter) {
        return new Promise(async (resolve, reject) => {
            let serverQueue = await this.queue.get(guild.id);
            if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

            if (!filter) return reject(new MusicPlayerError(PlayerErrors.setFilter.filterNotFound));
            if (!isNaN(filter)) return reject(new MusicPlayerError(PlayerErrors.setFilter.invalidFilterType));

            let searchFilter = Filters.find(filters => filters.name === filter);
            if (!searchFilter) return reject(new MusicPlayerError(PlayerErrors.setFilter.invalidFilterName));

            serverQueue.filter = searchFilter.value

            this.play(guild, serverQueue.songs[0].url);
            return resolve({ status: true, filter: filter, queue: serverQueue.songs });
        })
    }

    /**
     * Method for getting guild map
     * @param {Guild} guild Discord Guild 
     * @returns {Promise<GuildMap>} Returns an object with server queue parameters.
    */
    getGuildMap(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                return resolve(serverQueue);
            } catch (err) {
                return reject(err);
            }
        })
    }

    /**
     * Method for getting all filters of a module.
     * @returns {Promise<Array<Filters>>} Returns an array of all filters in the module.
    */
    getFilters() {
        return new Promise(async (resolve, reject) => {
            return resolve([Filters]);
        })
    }

    /**
     * Method for formatting numbers.
     * @param {Array} numbersArray Numbers Array
     * @returns {Array<String>} Returns an array with formatted numbers.
    */
    formatNumbers(numbersArray) {
        var numberArray = [];

        for (let i = 0; i < numbersArray.length; i++) {
            if (Number(numbersArray[i]) < 10) {
                numberArray.push('0' + numbersArray[i]);
            } else {
                numberArray.push(String(numbersArray[i]));
            }
        }

        return numberArray;
    }

    /**
     * Starts the song stream.
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Readable>} Returns a new stream object.
     * @private
    */
    createStream(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                let songInfo = await ytdl.getInfo(serverQueue.songs[0].url);

                let encoderArgs = serverQueue.filter ? ["-af", [serverQueue.filter]] : null;

                let streamOptions = {
                    opusEncoded: true,
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25,
                    encoderArgs,
                    dlChunkSize: 0
                };

                return resolve(await ytdl(songInfo, streamOptions));
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for initialization module.
     * @private
    */
    initPlayer() {
        this.ready = true;
        this.version = require('../package.json').version;
        this.author = require('../package.json').author;
    }
}