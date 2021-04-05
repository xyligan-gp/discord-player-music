const MusicPlayerError = require('./MusicPlayerError.js'), { EventEmitter } = require('events'), { Client, Guild, GuildMember, TextChannel, VoiceChannel, Message } = require('discord.js'), ytdl = require('ytdl-core'), ytSearch = require('yt-search');

module.exports = class MusicPlayer extends EventEmitter {

    /**
     * MusicPlayer Constructor
     * @param {Client} client Discord Client 
    */
    constructor(client) {
        super();

        if (!client) return new MusicPlayerError(`You have not specified a bot client!`);

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
     * @returns {Promise<Event>} Module Event
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
            .play(ytdl(serverQueue.songs[0].url, { quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25 }))
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
                resolve(this.emit('playerError', error));
            });
            dispatcher.setVolumeLogarithmic(serverQueue.volume);
        })
    }

    /**
     * Method for searching videos by user request
     * @param {GuildMember} member Discord Guild Member
     * @param {String} searchString Search String
     * @param {Message} message Discord Message
     * @returns {Promise<Array>} Array
    */
    searchVideo(member, searchString, message) {
        return new Promise(async (resolve, reject) => {
            let song = {}

            if (!searchString) return reject(new MusicPlayerError(`No search request found!`));

            const voiceChannel = member.voice.channel;
            if (!voiceChannel) return new reject(MusicPlayerError(`User or voice channel is not found!`));

            const permissions = voiceChannel.permissionsFor(this.client.user);
            if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) return reject(new MusicPlayerError(`Your client missing permissions CONNECT | SPEAK for connection to voice channel!`));

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
                resolve(this.emit('playerError', error));
            }
        })
    }

    /**
     * Method for getting song index
     * @param {Array} tracksArray Tracks Array
     * @param {Message} message Discord Message
     * @returns {Promise<Number>} Number 
    */
    getSongIndex(tracksArray, message) {
        return new Promise(async (resolve, reject) => {
            try {
                const filter = msg => msg.author.id === message.author.id;
                let collector = message.channel.createMessageCollector(filter, { time: 30000 });

                collector.on('collect', msg => {
                    if (!isNaN(msg.content)) {
                        let number = Math.floor(msg.content);
                        if (number < 1 || number > 10) return reject(new MusicPlayerError(`The specifie value is not valid! Min value: 1, Max value: 10`));

                        collector.stop();
                        return resolve(this.addSong(number, message.guild, tracksArray, message.channel, message.member.voice.channel));
                    } else {
                        collector.stop();
                        return reject(new MusicPlayerError(`The specifie value is not valid! Min value: 1, Max value: 10`));
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
     * @returns {Promise<Event>} Event
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
                        volume: 1,
                        loop: false,
                        playing: true
                    };

                    await queueConstruct.songs.push(songObject);
                    await resolve(this.queue.set(textChannel.guild.id, queueConstruct));

                    await resolve(this.play(textChannel.guild, songObject));
                    return await resolve(this.emit('playingSong', this.queue.get(guild.id)));
                } else {
                    await serverQueue.songs.push(songObject);

                    return await resolve(this.emit('songAdded', songObject));
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for skipping songs in the queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<object>} Object
    */
    skipSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                if (serverQueue.songs.length < 2) {
                    serverQueue.songs = [];
                    serverQueue.voiceChannel.leave();
                    this.queue.delete(guild.id);

                    resolve({ status: true, song: null });
                }

                serverQueue.connection.dispatcher.end();

                resolve({ status: true, song: serverQueue.songs[0] });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting a queue of server songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Array>} Array
    */
    getQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                return resolve(serverQueue.songs);
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting the current song to repet from the server queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<object>} Object
    */
    setLoopSong(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                serverQueue.loop = !serverQueue.loop;

                return resolve({ status: serverQueue.loop, song: serverQueue.songs[0] });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for setting to repeat server queue songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<object>} Object
    */
    setLoopQueue(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                if (serverQueue.songs.length < 2) {
                    serverQueue.loop = !serverQueue.loop;

                    resolve({ status: serverQueue.loop, songs: serverQueue.songs });
                }else{
                    serverQueue.loop = !serverQueue.loop;
                    serverQueue.connection.dispatcher.end();

                    resolve({ status: serverQueue.loop, songs: null });
                }
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for ending playing a queue of songs
     * @param {Guild} guild Discord Guild 
     * @returns {Promise<boolean>} Boolean
    */
    stopPlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

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
     * @returns {Promise<boolean>} Boolean
    */
    pausePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

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
     * @returns {Promise<boolean>} Boolean
    */
    resumePlaying(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

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
     * @returns {Promise<object>} Object
    */
    setVolume(guild, volumeValue) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                if (isNaN(volumeValue)) return reject(new MusicPlayerError(`The specified value is not a valid!`));
                let volume = Number(volumeValue);

                if (volume < 0.1) return reject(new MusicPlayerError(`The specified value is not a valid! Min value: 0.1`));

                serverQueue.connection.dispatcher.setVolumeLogarithmic(volume);
                serverQueue.volume = volume;

                resolve({ status: true, volume: volume });
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for getting information about the current song
     * @param {Guild} guild Discord Guild
     * @returns {Promise<object>} Object
    */
    getCurrentSongInfo(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

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
                        hours: songInfo.duration.hours,
                        minutes: songInfo.duration.minutes,
                        seconds: songInfo.duration.seconds
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
     * @returns {Promise<object>} Object 
    */
    joinVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if(!member.voice.channel) return reject(new MusicPlayerError(`User or voice channel is not found!`));
                
                let usersCollection = member.voice.channel.members;
                if(usersCollection.get(this.client.user.id)) return reject(new MusicPlayerError(`The client is already in the voice channel!`));

                await member.voice.channel.join();
                resolve({ status: true, voiceChannel: member.voice.channel });
            }catch(error){
                reject(error);
            }
        })
    }

    /**
     * Method for left your bot the voice channel
     * @param {GuildMember} member Discord Guild Member 
     * @returns {Promise<object>} Object
    */
    leaveVoiceChannel(member) {
        return new Promise(async (resolve, reject) => {
            try {
                if(!member.voice.channel) return reject(new MusicPlayerError(`User or voice channel is not found!`));

                let usersCollection = member.voice.channel.members.each(user => user.id === this.client.user.id);
                if(!usersCollection.get(this.client.user.id)) return reject(new MusicPlayerError(`The client is not already in the voice channel!`));

                await member.voice.channel.leave();
                resolve({ status: true, voiceChannel: member.voice.channel });
            }catch(error){
                reject(error);
            }
        })
    }

    /**
     * Method for creating progress bar
     * @param {Guild} guild Discord Guild
     * @returns {Promise<string>} String
    */
    createProgressBar(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(`Server queue not found!`));

                const seconds = Math.floor((Number(serverQueue.songs[0].duration.hours) * 3600) + (Number(serverQueue.songs[0].duration.minutes) * 60) + Number(serverQueue.songs[0].duration.seconds));
                const total = Math.floor(seconds * 1000);
                const current = Math.floor(serverQueue.connection.dispatcher.streamTime);
                const size = 11;
                const line = '▬';
                const slider = '🔘';

                if (!total) return (`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (!current) return (`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(total)) return (`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(current)) return (`🔘▬▬▬▬▬▬▬▬▬▬  [0%]`);
                if (isNaN(size)) return (`🔘▬▬▬▬▬▬▬▬▬  [0%]`);
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
                        resolve(`🔘▬▬▬▬▬▬▬▬▬▬ [${calculated}%]`);
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
     * Method for formatting numbers.
     * @param {Array} numbersArray Numbers Array
     * @returns {Array} Array
    */
    formatNumbers(numbersArray) {
        var numberArray = [];

        for(let i = 0; i < numbersArray.length; i++) {
            if(numbersArray[i] < 10) {
                numberArray.push('0' + numbersArray[i]);
            }else{
                numberArray.push(String(numbersArray[i]));
            }
        }

        return numberArray;
    }

    /**
     * Method for starting module
    */
    initPlayer() {
        this.ready = true;
    }
}