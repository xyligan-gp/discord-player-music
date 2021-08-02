const { Client, Collection, Guild, GuildMember, TextChannel, version, VoiceChannel, User } = require('discord.js');
const { createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel,VoiceConnection, VoiceConnectionStatus, entersState, StreamType, AudioPlayerStatus, AudioPlayer } = require('@discordjs/voice');
const search = require('yt-search');

const ytdl = require('./modules/dpm-ytdl.js');
const Emitter = require('./Emitter.js');
const PlayerError = require('./PlayerError.js');
const PlayerErrors = require('./PlayerErrors.js');

const QueueManager = require('./managers/QueueManager.js');
const UtilsManager = require('./managers/UtilsManager.js');
const VoiceManager = require('./managers/VoiceManager.js');

class DiscordPlayerMusic extends Emitter {
    /**
     * @param {Client} client Discord CLient
     * @param {DiscordPlayerMusicOptions} options Player Options
    */
    constructor(client, options) {
        super();

        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Status
         * @type {Boolean}
        */
        this.ready = false;

        /**
         * Player Queue Manager
         * @type {Collection<String, QueueManager>}
        */
        this.queue = new Collection();

        /**
         * Player Utils Manager
         * @type {UtilsManager}
        */
        this.utils = new UtilsManager(this.client, this.queue);
        
        /**
         * Player Options
         * @type {DiscordPlayerMusicOptions}
        */
        this.options = this.utils.checkOptions(options);

        /**
         * Player Documentation Link
         * @type {String}
        */
        this.docs = require('../package.json').homepage;
        
        /**
         * Player Version
         * @type {String}
        */
        this.version = require('../package.json').version;

        /**
         * Player Developer
        */
        this.author = require('../package.json').author;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = version.startsWith('12') ? '1' : '2';

        /**
         * Player Voice Manager
         * @type {VoiceManager}
        */
        this.voice = new VoiceManager(this.client);

        /**
         * Player Managers
         * @type {Array<String>}
        */
        this.managers = ['QueueManager', 'UtilsManager', 'VoiceManager'];

        /**
         * Player Managers Count
         * @type {Number}
        */
        this.size = this.managers.length;

        /**
         * Discord Dispatcher
         * @type {AudioPlayer}
        */
        this.audio = createAudioPlayer();

        this.init();
    }

    /**
     * Method for playing songs on the server
     * @param {Guild} guild Discord Guild
     * @param {PlayerSong} song Song Info
     * @fires DiscordPlayerMusic#playerError
     * @fires DiscordPlayerMusic#playingSong
     * @fires DiscordPlayerMusic#queueEnded
     * @returns {Promise<void>}
    */
    play(guild, song) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            
            switch(this.mode) {
                case '1': {
                    if(!song) {
                        if(!queue.songs) return;

                        queue.voiceChannel.leave();
                        return this.queue.delete(guild.id);
                    }

                    try {
                        const stream = await ytdl(song.url, queue.filter);
                        const dispatcher = queue.connection.play(stream, { type: 'ogg/opus' });
                        
                        dispatcher.on('finish', () => {
                            if(queue.songs.length < 1) return this.emit('queueEnded', queue);

                            if(queue.loop) {
                                this.play(guild, queue.songs[0]);
                            }else if(queue.queueLoop) {
                                const lastSong = queue.songs.shift();

                                queue.songs.push(lastSong);
                                this.play(guild, queue.songs[0]);
                            }else{
                                queue.songs.shift();
                                this.play(guild, queue.songs[0]);

                                if(queue.songs.length < 1) {
                                    queue.voiceChannel.leave();
                                    this.queue.delete(guild.id);

                                    return this.emit('queueEnded', queue);
                                }
                            }
                        })

                        dispatcher.on('error', error => {
                            return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                        })

                        dispatcher.setVolumeLogarithmic(queue.volume / 5);

                        return this.emit('playingSong', queue);
                    }catch(error){
                        return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                    }
                }

                case '2': {
                    if(!song) {
                        if(!queue.songs) return;

                        const connection = getVoiceConnection(guild.id);
                        connection.destroy();

                        return this.queue.delete(guild.id);
                    }

                    try {
                        const connection = getVoiceConnection(guild.id);
                        const stream = await ytdl(song.url, queue.filter);
                        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });

                        try {
                            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);

                            this.audio.play(resource);

                            connection.subscribe(this.audio);
                        } catch (error) {
                            connection.destroy();
                            this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                        }
                        
                        this.audio.on('stateChange', (oldState, newState) => {
                            if(newState.status === AudioPlayerStatus.Idle && oldState.status != AudioPlayerStatus.Idle) {
                                if(queue.songs.length < 1) return this.emit('queueEnded', queue);

                                if(queue.loop) {
                                    this.play(guild, queue.songs[0]);
                                }else if(queue.queueLoop) {
                                    const lastSong = queue.songs.shift();
                                    
                                    queue.songs.push(lastSong);
                                    this.play(guild, queue.songs[0]);
                                }else{
                                    queue.songs.shift();
                                    this.play(guild, queue.songs[0]);

                                    if(queue.songs.length < 1) {
                                        connection.destroy();
                                        this.queue.delete(guild.id);

                                        return this.emit('queueEnded', queue);
                                    }
                                }
                            }
                        })

                        this.audio.on('error', error => {
                            return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                        })
                    }catch(err){
                        return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: err });
                    }
                }
            }
        })
    }

    /**
     * Method to search for songs by user query
     * @param {GuildMember} member Guild Member
     * @param {String} query Song Name or URL
     * @param {TextChannel} channel Guild Text Channel
     * @returns {Array<PlayerSong>} Returns a list of found songs
    */
    searchSong(member, query, channel) {
        return new Promise(async (res, rej) => {
            if(!query) return rej(new PlayerError(PlayerErrors.default.searchSong.queryNotFound.replace('{userID}', member.id)));

            const voiceChannel = member.voice.channel;
            if(!voiceChannel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

            const clientMember = member.guild.members.cache.get(this.client.user.id);
            if(!this.utils.checkPermissions(clientMember, ['CONNECT', 'SPEAK'])) return rej(new PlayerError(PlayerErrors.default.permissionsNotFound.replace('{clientTag}', this.client.user.tag).replace('{permissions}', 'CONNECT & SPEAK')));

            try {
                if(query.startsWith('https://')) {
                    const songInfo = await ytdl.getInfo(query);

                    let song = [{
                        index: null,
                        searchType: 'search#url',
                        title: songInfo.videoDetails.title,
                        url: songInfo.videoDetails.video_url,
                        thumbnail: songInfo.videoDetails.thumbnails[0].url,
                        author: songInfo.videoDetails.author.name,
                        textChannel: channel,
                        voiceChannel: voiceChannel,
                        requestedBy: member.user,

                        duration: {
                            hours: this.utils.formatNumbers([Math.floor(songInfo.videoDetails.lengthSeconds / 3600)]).join(''),
                            minutes: this.utils.formatNumbers([Math.floor(songInfo.videoDetails.lengthSeconds / 60 % 60)]).join(''),
                            seconds: this.utils.formatNumbers([Math.floor(songInfo.videoDetails.lengthSeconds % 60)]).join('')
                        }
                    }]
                    
                    res(song);

                    this.addSong(1, member, song);
                }else{
                    const searchResult = await search(query);

                    var resultsArray = [];

                    for(let i = 0; i < this.options.searchResultsLimit; i++) {
                        resultsArray.push(
                            {
                                index: i + 1,
                                searchType: 'search#name',
                                title: searchResult.videos[i].title,
                                url: searchResult.videos[i].url,
                                thumbnail: searchResult.videos[i].thumbnail,
                                author: searchResult.videos[i].author.name,
                                textChannel: channel,
                                voiceChannel: voiceChannel,
                                requestedBy: member.user,

                                duration: {
                                    hours: this.utils.formatNumbers([Math.floor(searchResult.videos[i].duration.seconds / 3600)]).join(''),
                                    minutes: this.utils.formatNumbers([Math.floor(searchResult.videos[i].duration.seconds / 60 % 60)]).join(''),
                                    seconds: this.utils.formatNumbers([Math.floor(searchResult.videos[i].duration.seconds % 60)]).join('')
                                }
                            }
                        )
                    }

                    res(resultsArray);
                }
            }catch(err){
                return this.emit('playerError', { textChannel: channel, requested: member.user, method: 'searchSong', error: err });
            }
        })
    }

    /**
     * Method for adding a song to the server queue
     * @param {Number} index Song Index
     * @param {GuildMember} member Discord Guild
     * @param {Array<PlayerSong>} resultsArray Results List
     * @fires DiscordPlayerMusic#songAdded
     * @returns {Promise<void>} 
    */
    addSong(index, member, resultsArray) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(member.guild.id);

            switch(this.mode) {
                case '1': {
                    const connection = await resultsArray[index - 1].voiceChannel.join();
                    const song = resultsArray[index - 1];

                    if(!queue) {
                        const queueConstructor = {
                            textChannel: song.textChannel,
                            voiceChannel: song.voiceChannel,
                            connection: connection,
                            songs: [song],
                            volume: 5,
                            loop: false,
                            queueLoop: false,
                            playing: true,
                            filter: null
                        }

                        this.queue.set(member.guild.id, queueConstructor);

                        await this.play(member.guild, song);

                        return this.emit('playingSong', queue);
                    }else{
                        queue.songs.push(song);

                        this.emit('songAdded', song);
                    }
                }

                case '2': {
                    joinVoiceChannel({ guildId: member.guild.id, channelId: member.voice.channel.id, adapterCreator: member.guild.voiceAdapterCreator });

                    const connection = getVoiceConnection(member.guild.id);
                    const song = resultsArray[index - 1];

                    if(!queue) {
                        const queueConstructor = {
                            textChannel: song.textChannel,
                            voiceChannel: song.voiceChannel,
                            connection: connection,
                            songs: [song],
                            volume: 5,
                            loop: false,
                            queueLoop: false,
                            playing: true,
                            filter: null
                        }

                        this.queue.set(member.guild.id, queueConstructor);

                        await this.play(member.guild, song);

                        return this.emit('playingSong', queue);
                    }else{
                        queue.songs.push(song);

                        this.emit('songAdded', song);
                    }
                }
            }
        })
    }

    /**
     * Method to end playback of the server queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean }>} Returns the status of the operation
    */
    stop(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            switch(this.mode) {
                case '1': {
                    queue.songs = [];
                    queue.voiceChannel.leave();
                    this.queue.delete(guild.id);

                    return res({ status: true });
                }

                case '2': {
                    const connection = getVoiceConnection(guild.id);
                    connection.destroy();
                    queue.songs = [];
                    this.queue.delete(guild.id);

                    return res({ status: true });
                }
            }
        })
    }

    /**
     * Method for initializing the module
     * @fires DiscordPlayerMusic#ready
     * @returns {void}
    */
    init() {
        this.ready = true;

        this.emit('ready', this.client);
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} searchResultsLimit Limit the number of results when searching for songs
 * @property {Boolean} searchCollector Custom collector status when searching for songs
 * @property {Object} searchCollectorConfig Search Collector Configuration
 * @property {'message' | 'reaction'} searchCollectorConfig.type Search Collector Type
 * @property {Number} searchCollectorConfig.count Number of reactions/maximum song index (from options.searchResultsLimit)
 * @type {Object}
*/

/**
 * @typedef PlayerSong
 * @property {Number | null} index Song Index
 * @property {String} searchType Song Search Type
 * @property {String} title Song Title
 * @property {String} url Song URL
 * @property {String} thumbnail Song Image
 * @property {String} author Song Channel Author
 * @property {TextChannel} textChannel Guild Text Channel
 * @property {VoiceChannel} voiceChannel Guild Voice Channel
 * @property {User} requestedBy The user who installed the song
 * @property {Object} duration Song Duration
 * @property {Number | String} duration.hours Duration in hours
 * @property {Number | String} duration.minutes Duration in minutes
 * @property {Number | String} duration.seconds Duration in seconds
 * @type {Object}
*/

/**
 * Emits when the module is ready for work
 * @event DiscordPlayerMusic#ready
 * @param {Client} callback Callback
*/

/**
 * Emits when the song starts playing
 * @event DiscordPlayerMusic#playingSong
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Queue Text Channel
 * @param {VoiceChannel} callback.voiceChannel Queue Voice Channel
 * @param {VoiceConnection} callback.connection Queue Voice Connection
 * @param {Array<PlayerSong>} callback.songs Queue Songs
 * @param {Number} callback.volume Queue Songs Volume
 * @param {Boolean} callback.loop Queue Song Loop
 * @param {Boolean} callback.queueLoop Queue Song Queue Loop
 * @param {Boolean} callback.playing Queue Song Playing Status
 * @param {String} callback.filter Queue Songs Filter
*/

/**
 * Emits when a song is added to the queue
 * @event DiscordPlayerMusic#songAdded
 * @param {Object} callback Callback
 * @param {Number} callback.index Song Position in Queue
 * @param {String} callback.searchType Search Type (URL or Name)
 * @param {String} callback.title Song Title
 * @param {String} callback.url Song URL
 * @param {String} callback.thumbnail Song Thumbnail
 * @param {String} callback.author Song Uploader
 * @param {TextChannel} callback.textChannel Text Channel
 * @param {VoiceChannel} callback.voiceChannel Voice Channel
 * @param {User} callback.requestedBy Requester of the Song
 * @param {Object} callback.duration Song Duration
*/

/**
 * Emits when the queue ends
 * @event DiscordPlayerMusic#queueEnded
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Queue Text Channel
 * @param {VoiceChannel} callback.voiceChannel Queue Voice Channel
 * @param {VoiceConnection} callback.connection Queue Voice Connection
 * @param {Array<PlayerSong>} callback.songs Queue Songs
 * @param {Number} callback.volume Queue Songs Volume
 * @param {Boolean} callback.loop Queue Song Loop
 * @param {Boolean} callback.queueLoop Queue Song Queue Loop
 * @param {Boolean} callback.playing Queue Song Playing Status
 * @param {String} callback.filter Queue Songs Filter
*/

/**
 * Emits when an error occurs
 * @event DiscordPlayerMusic#playerError
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Text Channel
 * @param {User} callback.requestedBy Song Requested User
 * @param {String} callback.method Executed Method
 * @param {Error} callback.error Returned Error
*/

module.exports = DiscordPlayerMusic;