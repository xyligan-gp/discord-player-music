const MusicPlayerError = require('./MusicPlayerError.js'), { EventEmitter } = require('events'), { Client, Guild, GuildMember, TextChannel, VoiceChannel, Message } = require('discord.js'), ytdl = require('ytdl-core'), ytSearch = require('yt-search');

module.exports = class MusicPlayer extends EventEmitter {

    /**
     * MusicPlayer Constructor
     * @param {Client} client Discord Client 
    */
    constructor(client) {
        super();

        if (!client) return new MusicPlayerError('You have not specified a bot client!');

        /**
         * Discord Client
        */
        this.client = client;

        /**
         * Player Queues 
        */
        this.queue = new Map();

        /**
         * Module Manager Status
        */
        this.ready = false;

        /**
         * Method for starting module
        */
        this.initPlayer();
    }

    /**
     * Method for videos playback
     * @param {Guild} guild Discord Guild 
     * @param {Object} song Song Object 
     * @returns {Event | Error} Event | Error
    */
    play(guild, song) {
        return new Promise(async (resolve, reject) => {
            const serverQueue = await this.queue.get(guild.id);

            if (!song) {
                if (!serverQueue.songs) return;

                serverQueue.voiceChannel.leave();
                return this.queue.delete(guild.id);
            }

            const dispatcher = serverQueue.connection
                .play(ytdl(serverQueue.songs[0].url))
                .on("finish", () => {
                    if (serverQueue.songs.length < 1) return this.emit('queueEnded', serverQueue);

                    if (serverQueue.loop) {
                        let lastsong = serverQueue.songs.shift();

                        serverQueue.songs.push(lastsong);
                        this.play(guild, serverQueue.songs[0]);

                        resolve(this.emit('playingSong', serverQueue));
                    } else {
                        serverQueue.songs.shift();
                        this.play(guild, serverQueue.songs[0]);

                        if (serverQueue.songs.length < 1) {
                            serverQueue.voiceChannel.leave();
                            this.queue.delete(guild.id);

                            resolve(this.emit('queueEnded', serverQueue));
                        } else {
                            resolve(this.emit('playingSong', serverQueue));
                        }
                    }
                })
                .on("error", error => {
                    serverQueue.voiceChannel.leave();
                    this.queue.delete(guild.id);
                    reject(this.emit('playerError', error));
                });
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        })
    }

    /**
     * Method for searching videos by user request
     * @param {GuildMember} member Discord Guild Member
     * @param {String} searchString Search String
     * @param {Message} message Discord Message
     * @returns {Promise<Array | Error>} Array | Error
    */
    searchVideo(member, searchString, message) {
        return new Promise(async (resolve, reject) => {
            let song = {}

           if (!searchString) throw new MusicPlayerError('Search String is not found!');

            const voiceChannel = member.voice.channel;
            if (!voiceChannel) throw new MusicPlayerError('Voice channel not found!');

            const permissions = voiceChannel.permissionsFor(this.client.user);
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) throw new MusicPlayerError(`Don't have permissions CONNECT | SPEAK!`);

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

                        duration: {
                            hours: Math.floor(songInfo.videoDetails.lengthSeconds / 3600),
                            minutes: Math.floor(songInfo.videoDetails.lengthSeconds / 60 % 60),
                            seconds: Math.floor(songInfo.videoDetails.lengthSeconds % 60)
                        }
                    })

                    resolve([song]);
                    return resolve(this.addSong(1, member.guild, [song], message.channel, voiceChannel));
                } else {
                    const videoResult = await ytSearch(searchString);

                    var tracksArray = [];

                    for (let i = 0; i < 10; i++) {
                        tracksArray.push({
                            index: i + 1,
                            searchType: 'search#string',
                            title: videoResult.videos[i].title,
                            url: videoResult.videos[i].url,
                            thumbnail: videoResult.videos[i].thumbnail,
                            author: videoResult.videos[i].author.name,
                            textChannel: message.channel,
                            voiceChannel: message.member.voice.channel,

                            duration: {
                                hours: Math.floor(videoResult.videos[i].seconds / 3600),
                                minutes: Math.floor(videoResult.videos[i].seconds / 60 % 60),
                                seconds: Math.floor(videoResult.videos[i].seconds % 60)
                            }
                        })
                    }

                    resolve(tracksArray);
                    return resolve(this.getSongIndex(tracksArray, message));
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting song index
     * @param {Array} tracksArray Tracks Array
     * @param {Message} message Discord Message
     * @returns {Number | Error} Number | Error 
    */
    getSongIndex(tracksArray, message) {
        return new Promise(async (resolve, reject) => {
            try {
                const filter = msg => msg.author.id === message.author.id;
                let collector = message.channel.createMessageCollector(filter, { time: 30000 });

                collector.on('collect', msg => {
                    if (!isNaN(msg.content)) {
                        let number = Math.floor(msg.content);
                        if (number < 1 || number > 10) throw new MusicPlayerError('The specifie value is not suitable!');

                        collector.stop()
                        return resolve(this.addSong(number, message.guild, tracksArray, message.channel, message.member.voice.channel));
                    } else {
                        collector.stop()
                        throw new MusicPlayerError('The specifie value is not suitable!');
                    }
                })
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for adding a song to the server queue
     * @param {Number} index Song Index
     * @param {Guild} guild Discord Guild
     * @param {Array} tracksArray Songs Array 
     * @param {TextChannel} textChannel Discord Text Channel 
     * @param {VoiceChannel} voiceChannel Discord Voice Channel 
     * @returns {Event | Error} Event | Error
    */
    addSong(index, guild, tracksArray, textChannel, voiceChannel) {
        return new Promise(async (resolve, reject) => {
            try {
                let connection = await voiceChannel.join()
                let serverQueue = await this.queue.get(guild.id);
                let songObject = tracksArray[index - 1];

                if (!serverQueue) {
                    const queueConstruct = {
                        textChannel: textChannel,
                        voiceChannel: voiceChannel,
                        connection: connection,
                        songs: [],
                        volume: 2,
                        loop: false,
                        playing: true
                    };

                    await queueConstruct.songs.push(songObject);
                    await resolve(this.queue.set(textChannel.guild.id, queueConstruct));

                    await resolve(this.play(textChannel.guild, songObject));
                    return await resolve(this.emit('playingSong', this.queue.get(guild.id)));
                } else {
                    await serverQueue.songs.push(songObject);

                    await resolve(this.emit('songAdded', songObject));
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for skipping songs in the queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    skipSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let queue = await this.queue.get(guild.id);
                if (!queue) throw new MusicPlayerError('ServerQueue is not found!');

                if (queue.songs.length < 2) {
                    queue.songs = [];
                    queue.voiceChannel.leave();
                    this.queue.delete(guild.id);

                    resolve(true);
                }

                queue.connection.dispatcher.end();

                resolve(true);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting a queue of server songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Array | Error>} Array | Error
    */
    getQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let queue = await this.queue.get(guild.id);
                if (!queue) throw new MusicPlayerError('ServerQueue is not found!');

                return resolve(queue.songs);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting the current song to repet from the server queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    setLoopSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let queue = await this.queue.get(guild.id);
                if (!queue) throw new MusicPlayerError('ServerQueue is not found!');

                queue.loop = !queue.loop;

                return resolve(queue.loop);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting to repeat server queue songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    setLoopQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let queue = await this.queue.get(guild.id);
                if (!queue) throw new MusicPlayerError('ServerQueue is not found!');
                if (queue.songs.length < 2) {
                    queue.loop = !queue.loop;

                    resolve(queue.loop);
                }else{
                    queue.loop = !queue.loop;
                    queue.connection.dispatcher.end();

                    resolve(queue.loop);
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for ending playing a queue of songs
     * @param {Guild} guild Discord Guild 
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    stopPlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');

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
     * Method to pause song playback
     * @param {Guild} guild Discord Guild
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    pausePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');

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
     * Method to restore playing songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    resumePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');

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
     * Method for changing the playback volume of songs
     * @param {Guild} guild 
     * @param {Number} volumeValue 
     * @returns {Promise<object | Error>} Object | Error
    */
    setVolume(guild, volumeValue) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');

                if (isNaN(volumeValue)) throw new MusicPlayerError('Invalid data type for: volumeValue');
                let volume = Number(volumeValue);

                if (volume < 0.1) throw new MusicPlayerError('The specified value is invalid: volumeValue');

                serverQueue.connection.dispatcher.setVolumeLogarithmic(volume / 5);

                resolve({ status: true, volume: volume });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting information about the current song
     * @param {Guild} guild Discord Guild
     * @returns {Promise<object | Error>} Object | Error
    */
    getCurrentSongInfo(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');
                let songInfo = serverQueue.songs[0];

                let songObject = ({
                    searchType: String(songInfo.searchType),
                    title: String(songInfo.title),
                    url: String(songInfo.url),
                    thumbnail: String(songInfo.thumbnail),
                    author: String(songInfo.author),
                    textChannel: songInfo.textChannel,
                    voiceChannel: songInfo.voiceChannel,

                    duration: {
                        hours: Number(songInfo.duration.hours),
                        minutes: Number(songInfo.duration.minutes),
                        seconds: Number(songInfo.duration.seconds)
                    }
                })

                resolve(songObject);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for joining your bot in voice channel 
     * @param {GuildMember} member Discord Guild Member 
     * @returns {Promise<boolean | Error>} Boolean | Error 
    */
    joinVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if(!member.voice.channel) return new MusicPlayerError('User in voice channel not found!');

                await member.voice.channel.join();
                resolve(true);
            }catch(error){
                reject(error);
            }
        })
    }

    /**
     * Method for left your bot the voice channel
     * @param {GuildMember} member Discord Guild Member 
     * @returns {Promise<boolean | Error>} Boolean | Error
    */
    leaveVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if(!member.voice.channel) return new MusicPlayerError('User in voice channel not found!');

                await member.voice.channel.leave();
                resolve(true);
            }catch(error){
                reject(error);
            }
        })
    }

    /**
     * Method for creating progress bar
     * @param {Guild} guild Discord Guild
     * @returns {Promise<string | Error>} String | Error
    */
    createProgressBar(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = this.queue.get(guild.id);
                if (!serverQueue) throw new MusicPlayerError('ServerQueue is not found!');

                const seconds = Math.floor((serverQueue.songs[0].duration.hours * 3600) + (serverQueue.songs[0].duration.minutes * 60) + serverQueue.songs[0].duration.seconds);
                const total = Math.floor(seconds * 1000);
                const current = Math.floor(serverQueue.connection.dispatcher.streamTime);
                const size = 10;
                const line = '▬';
                const slider = '🔘';

                if (!total) return (`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [0%]`);
                if (!current) return (`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [0%]`);
                if (isNaN(total)) return (`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [0%]`);
                if (isNaN(current)) return (`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [0%]`);
                if (isNaN(size)) return (`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [0%]`);
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
                        resolve(`🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬ [${calculated}%]`);
                    } else {
                        resolve(`${bar} [${calculated}%]`);
                    }
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for starting module
    */
    initPlayer() {
        this.ready = true;
    }
}