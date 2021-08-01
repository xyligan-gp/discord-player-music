const { Client, Collection, Guild, GuildMember, TextChannel, version, VoiceChannel } = require('discord.js');
const search = require('yt-search');
const ytdl = require('./modules/dpm-ytdl.js');
const Emitter = require('./Emitter.js');
const PlayerError = require('./PlayerError.js');
const PlayerErrors = require('./PlayerErrors.js');

const QueueManager = require('./managers/QueueManager.js');
const UtilsManager = require('./managers/UtilsManager.js');
const VoiceManager = require('./managers/VoiceManager.js');
const { getVoiceConnection } = require('@discordjs/voice');

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
    }

    /**
     * Method for playing songs on the server
     * @param {Guild} guild Discord Guild
     * @param {PlayerSong} song Song Info
     * @returns {Promise<void>}
    */
    play(guild, song) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            
            switch(this.mode) {
                case '1': {
                    console.log(1);
                    if(!song) {
                        if(!queue.songs) return;

                        queue.voiceChannel.leave();
                        return this.queue.delete(guild.id);
                    }

                    try {
                        const stream = await this.utils.createStream(guild);

                        const dispatcher = queue.connection;
                        dispatcher.play(stream, { type: 'opus' });
                        
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

                        dispatcher.on('error', err => {
                            return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: err });
                        })

                        dispatcher.setVolumeLogarithmic(queue.volume / 5);

                        return this.emit('playingSong', queue);
                    }catch(err){
                        return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: err });
                    }
                }

                case '2': {
                    console.log(2)
                    //to be continued
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
                return this.emit('playerError', { textChannel: channel, requestedBy: member.user, method: 'searchSong', error: err });
            }
        })
    }

    /**
     * Method for adding a song to the server queue
     * @param {Number} index Song Index
     * @param {GuildMember} member Discord Guild
     * @param {Array<PlayerSong>} resultsArray Results List
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
                    await this.voice.join(member);

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
     * Method for initializing the module
     * @returns {void}
    */
    init() {
        this.ready = true;
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

module.exports = DiscordPlayerMusic;