const { Client, Collection, Guild, GuildMember, TextChannel, VoiceChannel, User } = require('discord.js');
const { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const search = require('yt-search');
const searchLyrics = require('lyrics-finder');

const ms = require('./modules/ms.js');
const parse = ms => ({
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000 % 24),
    minutes: Math.floor(ms / 60000 % 60),
    seconds: Math.floor(ms / 1000 % 60)
});
const ytdl = require('./modules/dpm-ytdl.js');

const Emitter = require('./Emitter.js');
const PlayerError = require('./PlayerError.js');
const PlayerErrors = require('./PlayerErrors.js');

const CollectorsManager = require('./managers/CollectorsManager.js');
const QueueManager = require('./managers/QueueManager.js');
const UtilsManager = require('./managers/UtilsManager.js');
const VoiceManager = require('./managers/VoiceManager.js');

/**
 * The class responsible for the main part of the module
 * @extends {Emitter}
*/
class DiscordPlayerMusic extends Emitter {
    /**
     * @param {Client} client Discord CLient
     * @param {DiscordPlayerMusicOptions} options Player Options
    */
    constructor(client, options) {
        super();

        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Player Utils Manager
         * @type {UtilsManager}
        */
        this.utils = new UtilsManager();

        this.utils.checkNode();

        /**
         * Player Options
         * @type {DiscordPlayerMusicOptions}
        */
        this.options = this.utils.checkOptions(options);

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = this.utils.getPlayerMode();

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
         * @type {String}
        */
        this.author = require('../package.json').author;

        /**
         * Player Voice Manager
         * @type {VoiceManager}
        */
        this.voice = new VoiceManager(this.client);

        /**
         * Player Collectors Manager
         * @type {CollectorsManager}
        */
        this.collectors = new CollectorsManager(this);

        /**
         * Player Managers
         * @type {Array<String>}
        */
        this.managers = ['CollectorsManager', 'QueueManager', 'UtilsManager', 'VoiceManager'];

        /**
         * Player Managers Count
         * @type {Number}
        */
        this.size = this.managers.length;

        /**
         * Player Filters
         * @type {Array<PlayerFilter>}
        */
        this.filters = [
            { name: '3D', value: 'apulsator=hz=0.125' },
            { name: 'bassboost', value: 'bass=g=10,dynaudnorm=f=150:g=15' },
            { name: 'echo', value: 'aecho=0.8:0.9:1000:0.3' },
            { name: 'fadein', value: 'afade=t=in:ss=0:d=10' },
            { name: 'flanger', value: 'flanger' },
            { name: 'gate', value: 'agate' },
            { name: 'haas', value: 'haas' },
            { name: 'karaoke', value: 'stereotools=mlev=0.1' },
            { name: 'nightcore', value: 'asetrate=48000*1.25,aresample=48000,bass=g=5' },
            { name: 'reverse', value: 'areverse' },
            { name: 'vaporwave', value: 'asetrate=48000*0.8,aresample=48000,atempo=1.1' },
            { name: 'mcompand', value: 'mcompand' },
            { name: 'phaser', value: 'aphaser' },
            { name: 'tremolo', value: 'tremolo' },
            { name: 'surround', value: 'surround' },
            { name: 'slowed', value: 'asetrate=25000*1.25,aresample=50000,bass=g=2' },
            { name: 'earwax', value: 'earwax' },
            { name: 'underwater', value: 'aresample=5000' },
            { name: 'clear', value: null },
        ];

        this.init();

        this.on('playerError', data => {
            if(!data.textChannel) return;

            if(data.error.message.includes('Status code: 403')) {
                this.getGuildMap(data.textChannel.guild)
                
                .then(async queue => {
                    switch(this.mode) {
                        case 'v12': {
                            return this.play(queue.textChannel.guild, queue.songs[0]);
                        }

                        case 'v13': {
                            const stream = await ytdl(queue.songs[0].url, queue.filter);
                            const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });

                            queue.dispatcher.play(resource);
                            return this.emit('playingSong', queue);
                        }
                    }
                }).catch(error => { return })
            }else{
                const queue = this.queue.get(data.textChannel.guild.id);
                if(!queue) return;

                switch(this.mode) {
                    case 'v12': {
                        queue.voiceChannel.leave();
                        return this.queue.delete(data.textChannel.guild.id);
                    }

                    case 'v13': {
                        const connection = queue.connection;

                        if(connection.state.status === VoiceConnectionStatus.Destroyed) {
                            return this.queue.delete(data.textChannel.guild.id);
                        }else{
                            connection.destroy();
                            return this.queue.delete(data.textChannel.guild.id);
                        }
                    }
                }
            }
        })
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
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));
            
            switch(this.mode) {
                case 'v12': {
                    if(!song) {
                        if(!queue.songs) return;

                        queue.voiceChannel.leave();
                        return this.queue.delete(guild.id);
                    }

                    try {
                        const stream = await ytdl(song.url, queue.filter);
                        const dispatcher = queue.connection.play(stream, { type: 'ogg/opus' });
                        
                        dispatcher.on('finish', () => {
                            if(queue.songs.length < 1) {
                                queue.voiceChannel.leave();
                                
                                return this.emit('queueEnded', queue);
                            }

                            if(queue.loop.song) {
                                this.play(guild, queue.songs[0]);
                            }else if(queue.loop.queue) {
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

                case 'v13': {
                    const connection = queue.connection;

                    if(!song) {
                        if(!queue.songs) return;

                        if(connection.state.status === VoiceConnectionStatus.Destroyed) {
                            return this.queue.delete(guild.id);
                        }else {
                            connection.destroy();
                            this.queue.delete(guild.id);

                            return this.emit('queueEnded', queue);
                        }
                    }

                    try {
                        const stream = await ytdl(song.url, queue.filter);
                        const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });
                        const dispatcher = queue.dispatcher;

                        try {
                            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);

                            queue.dispatcher.setMaxListeners(Infinity);
                            queue.dispatcher.play(resource);

                            connection.state.subscription?.player ? false : connection.subscribe(dispatcher);
                        } catch (error) {
                            if(connection.state.status === VoiceConnectionStatus.Destroyed) {
                                return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                            }else{
                                connection.destroy();
                                
                                return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                            }
                        }
                        
                        dispatcher.once(AudioPlayerStatus.Idle, () => {
                            if(queue.songs.length < 1) {
                                if(connection.state.status === VoiceConnectionStatus.Destroyed) {
                                    this.queue.delete(guild.id);

                                    return this.emit('queueEnded', queue);
                                }else{
                                    connection.destroy();
                                    this.queue.delete(guild.id);
                
                                    return this.emit('queueEnded', queue);
                                }
                            }

                            if(queue.loop.song) {
                                return this.play(guild, queue.songs[0]);
                            }else if(queue.loop.queue) {
                                const lastSong = queue.songs.shift();

                                queue.songs.push(lastSong);
                                return this.play(guild, queue.songs[0]);
                            }else{
                                if(queue.songs.length < 1) {
                                    if(connection.state.status === VoiceConnectionStatus.Destroyed) {
                                        this.queue.delete(guild.id);
            
                                        return this.emit('queueEnded', queue);
                                    }else{
                                        connection.destroy();
                                        this.queue.delete(guild.id);
                
                                        return this.emit('queueEnded', queue);
                                    }
                                }
                                    
                                queue.songs.shift();
                                return this.play(guild, queue.songs[0]);
                            }
                        })

                        dispatcher.on('error', error => {
                            return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
                        })

                        dispatcher.state.resource.volume.setVolume(queue.volume / this.options.defaultVolume);

                        return this.emit('playingSong', queue);
                    }catch(error){
                        return this.emit('playerError', { textChannel: song.textChannel, requested: song.requestedBy, method: 'play', error: error });
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
            if(!query) return rej(new PlayerError(PlayerErrors.default.queryNotFound.replace('{userID}', member.id)));

            const voiceChannel = member.voice.channel;
            if(!voiceChannel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

            const clientMember = member.guild.members.cache.get(this.client.user.id);
            if(!this.utils.checkPermissions(clientMember, ['CONNECT', 'SPEAK'])) return rej(new PlayerError(PlayerErrors.default.permissionsNotFound.replace('{clientTag}', this.client.user.tag).replace('{permissions}', 'CONNECT & SPEAK')));

            try {
                if(query.startsWith('https://') || query.startsWith('http://')) {
                    const songInfo = await ytdl.getInfo(query);
                    const songDuration = this.utils.formatNumbers([Math.floor(songInfo.videoDetails.lengthSeconds / 3600), Math.floor(songInfo.videoDetails.lengthSeconds / 60 % 60), Math.floor(songInfo.videoDetails.lengthSeconds % 60)]);

                    let song = [{
                        searchType: 'search#url',
                        title: songInfo.videoDetails.title,
                        url: songInfo.videoDetails.video_url,
                        thumbnail: songInfo.videoDetails.thumbnails[0].url,
                        author: songInfo.videoDetails.author.name,
                        textChannel: channel,
                        voiceChannel: voiceChannel,
                        requestedBy: member.user,

                        duration: {
                            hours: songDuration[0],
                            minutes: songDuration[1],
                            seconds: songDuration[2]
                        }
                    }]
                    
                    res(song);

                    this.addSong(1, member, song);
                }else{
                    const searchResult = await search(query);
                    if(!searchResult) return rej(new PlayerError(PlayerErrors.default.resultsNotFound.replace('{query}', query)));

                    var resultsArray = [];

                    for(let i = 0; i < this.options.searchResultsLimit; i++) {
                        const songDuration = this.utils.formatNumbers([Math.floor(searchResult.videos[i].duration.seconds / 3600), Math.floor(searchResult.videos[i].duration.seconds / 60 % 60), Math.floor(searchResult.videos[i].duration.seconds % 60)]);

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
                                    hours: songDuration[0],
                                    minutes: songDuration[1],
                                    seconds: songDuration[2]
                                }
                            }
                        )
                    }

                    res(resultsArray);
                }
            }catch(error){
                return this.emit('playerError', { textChannel: channel, requested: member.user, method: 'searchSong', error: error });
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
                case 'v12': {
                    const connection = await resultsArray[index - 1].voiceChannel.join();
                    const song = resultsArray[index - 1];

                    if(!queue) {
                        const queueConstructor = {
                            textChannel: song.textChannel,
                            voiceChannel: song.voiceChannel,
                            connection: connection,
                            songs: [song],
                            volume: this.options.defaultVolume,

                            loop: {
                                song: false,
                                queue: false
                            },

                            startStream: Date.now(),
                            playing: true,
                            filter: null
                        }

                        this.queue.set(member.guild.id, queueConstructor);

                        return this.play(member.guild, song);
                    }else{
                        queue.songs.push(song);

                        return this.emit('songAdded', song);
                    }
                }

                case 'v13': {
                    const song = resultsArray[index - 1];
                    let connection = getVoiceConnection(member.guild.id);

                    connection ? connection = connection : connection = joinVoiceChannel({ guildId: member.guild.id, channelId: member.voice.channel.id, adapterCreator: member.guild.voiceAdapterCreator });

                    if(!queue) {
                        const queueConstructor = {
                            textChannel: song.textChannel,
                            voiceChannel: song.voiceChannel,
                            connection: connection,
                            dispatcher: connection.state.subscription?.player ? connection.state.subscription.player : createAudioPlayer(),
                            songs: [song],
                            volume: this.options.defaultVolume,
                            
                            loop: {
                                song: false,
                                queue: false
                            },

                            startStream: Date.now(),
                            playing: true,
                            filter: null
                        }

                        this.queue.set(member.guild.id, queueConstructor);

                        return this.play(member.guild, song);
                    }else{
                        queue.songs.push(song);

                        return this.emit('songAdded', song);
                    }
                }
            }
        })
    }

    /**
     * Method to pause song playback
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean }>} Returns the pause status of a queue
    */
    pause(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));
            if(!queue.playing) return rej(new PlayerError(PlayerErrors.default.queuePaused.replace('{guildID}', guild.id)));

            switch(this.mode) {
                case 'v12': {
                    queue.playing = false;
                    queue.connection.dispatcher.pause();

                    return res({ status: true });
                }

                case 'v13': {
                    queue.playing = false;
                    queue.dispatcher.pause();

                    return res({ status: true });
                }
            }
        })
    }

    /**
     * Method for setting the current song to repet from the server queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, song: PlayerSong }>} Returns the repeat status of a song and information about it
    */
    setLoopSong(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            if(this.options.synchronLoop) {
                queue.loop.song = !queue.loop.song;
                if(queue.loop.queue) queue.loop.queue = !queue.loop.queue;
            }else if(!this.options.synchronLoop){
                queue.loop.song = !queue.loop.song;
            }

            return res({ status: queue.loop.song, song: queue.songs[0] });
        })
    }

    /**
     * Method for skipping songs in the queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, song: PlayerSong }>} Returns the status of the operation and information about the song
    */
    skip(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            switch(this.mode) {
                case 'v12': {
                    if(queue.songs.length < 2) {
                        queue.songs = [];
                        queue.voiceChannel.leave();
                        this.queue.delete(guild.id);

                        return res({ status: true, song: null });
                    }else if(queue.loop.song) {
                        const song = queue.songs.shift();
                        queue.songs.push(song);
                        queue.connection.dispatcher.end();
                    }else{
                        queue.connection.dispatcher.end();
                    }

                    return res({ status: true, song: queue.songs[1] || null });
                }

                case 'v13': {
                    if(queue.songs.length < 2) {
                        queue.songs = [];

                        if(queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
                            this.queue.delete(guild.id);

                            return res({ status: true, song: null });
                        }else{
                            queue.connection.destroy();
                            this.queue.delete(guild.id);

                            return res({ status: true, song: null });
                        }
                    }else if(queue.loop.song) {
                        const song = queue.songs.shift();
                        queue.songs.push(song);
                        queue.dispatcher.stop();
                    }else{
                        queue.dispatcher.stop();
                    }

                    return res({ status: true, song: queue.songs[1] || null });
                }
            }
        })
    }

    /**
     * Method for adding filter to play songs
     * @param {Guild} guild Discord Guild
     * @param {String} [filter=clear] Filter Name
     * @returns {Promise<{ status: Boolean, filter: PlayerFilter, queue: Array<PlayerSong> }>} Returns the filter installation status and information about it
    */
    setFilter(guild, filter) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            filter && filter.length != 0 ? filter = filter : filter = 'clear';

            const getFilter = this.filters.find(filters => filters.name === filter);
            if(!getFilter) return rej(new PlayerError(PlayerErrors.default.filterNotFound.replace('{filter}', filter)));

            queue.filter = getFilter.value;
            switch(this.mode) {
                case 'v12': {
                    this.play(guild, queue.songs[0]);

                    return res({ status: true, filter: { name: getFilter.name, value: getFilter.value }, queue: queue.songs });
                }

                case 'v13': {
                    const stream = await ytdl(queue.songs[0].url, queue.filter);
                    const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });

                    queue.dispatcher.play(resource);

                    queue.dispatcher.state.resource.volume.setVolume(queue.volume / this.options.defaultVolume);

                    return res({ status: true, filter: { name: getFilter.name, value: getFilter.value }, queue: queue.songs });
                }
            }
        })
    }

    /**
     * Method for shuffling songs in queue
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Array<PlayerSong>>} Returns a shuffled server queue
    */
    shuffle(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            const currentSong = queue.songs.shift();

            for(let i = queue.songs.length - 1; i > 0; i--) {
                const index = Math.floor(Math.random() * (i + 1));
                [queue.songs[i], queue.songs[index]] = [queue.songs[index], queue.songs[i]];
            }

            queue.songs.unshift(currentSong);

            return res(queue.songs);
        })
    }

    /**
     * Method for getting guild map
     * @param {Guild} guild Discord Guild
     * @returns {Promise<PlayerQueue>} Returns an object with server queue parameters
    */
    getGuildMap(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            return res(queue);
        })
    }

    /**
     * Method for getting a queue of server songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<Array<PlayerSong>>} Returns an array of songs being played on the server
    */
    getQueue(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            return res(queue.songs);
        })
    }

    /**
     * Method for getting information about a song
     * @param {Guild} guild Discord Guild
     * @param {Number} [index=1] Song Index
     * @returns {Promise<{ song: PlayerSong, dispatcherInfo: Object }>} Returns information about the requested song
    */
    getSongInfo(guild, index) {
        return new Promise(async (res, rej) => {
            var songInfo, filter;

            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            index && typeof index != 'number' ? songInfo = queue.songs[0] : queue.songs[index - 1] ? songInfo = queue.songs[index - 1] : songInfo = queue.songs[0];

            queue.filter === null ? filter = { name: 'clear', value: null } : filter = this.filters.find(filter => filter.value === queue.filter);
            const streamTime = parse(Date.now() - queue.startStream);

            return res({ song: songInfo, dispatcherInfo: { loop: queue.loop, filter: filter, playing: queue.playing, streamTime: streamTime } });
        })
    }

    /**
     * Method for finding lyrics for a song
     * @param {Guild} guild Discord Guild
     * @param {String} [query=string] Song Name
     * @returns {Promise<{ song: String | PlayerSong, lyrics: String }>} Returns the lyrics of the requested song
    */
    getLyrics(guild, query) {
        return new Promise(async (res, rej) => {
            if(query) {
                const lyrics = await searchLyrics(query, '');
                if(!lyrics) return rej(new PlayerError(PlayerErrors.default.lyricsNotFound.replace('{query}', query)));

                return res({ song: query, lyrics: lyrics });
            }else{
                const queue = this.queue.get(guild.id);
                if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

                const lyrics = await searchLyrics(queue.songs[0].title, '');
                if(!lyrics) return rej(new PlayerError(PlayerErrors.default.lyricsNotFound.replace('{query}', queue.songs[0].title)));

                return res({ song: queue.songs[0], lyrics: lyrics });
            }
        })
    }

    /**
     * Method for getting all filters of a module
     * @returns {Array<PlayerFilter>} Returns the collection of module filters
    */
    getFilters() {
        return new Promise(async (res, rej) => {
            return res(this.filters);
        })
    }

    /**
     * Method for creating progress bar
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ bar: String, percents: String }>} Returns an object with the progress bar data
    */
    createProgressBar(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            switch(this.mode) {
                case 'v12': {
                    if(!queue.connection.dispatcher) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });

                    const seconds = Math.floor((Number(queue.songs[0].duration.hours) * 3600) + (Number(queue.songs[0].duration.minutes) * 60) + Number(queue.songs[0].duration.seconds));
                    const total = Math.floor(seconds * 1000);
                    const current = Math.floor(queue.connection.dispatcher.streamTime || 0);

                    const size = 11;
                    const line = '▬';
                    const slider = '🔘';

                    if (!total) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (!current) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(total)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(current)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(size)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });

                    if (current > total) {
                        const bar = line.repeat(size + 2);
                        const percentage = (current / total) * 100;

                        return res({ bar: bar, percents: `${percentage}%` });
                    } else {
                        const percentage = current / total;
                        const progress = Math.round((size * percentage));
                        const emptyProgress = size - progress;
                        const progressText = line.repeat(progress).replace(/.$/, slider);
                        const emptyProgressText = line.repeat(emptyProgress);
                        const bar = progressText + emptyProgressText;
                        const calculated = Math.floor(percentage * 100);

                        if (calculated < 5) {
                            res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: `${calculated}%` });
                        } else {
                            res({ bar: bar, percents: `${calculated}%` });
                        }
                    }
                }

                case 'v13': {
                    if(!queue.dispatcher) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });

                    const seconds = Math.floor((Number(queue.songs[0].duration.hours) * 3600) + (Number(queue.songs[0].duration.minutes) * 60) + Number(queue.songs[0].duration.seconds));
                    const total = Math.floor(seconds * 1000);
                    const current = Math.floor(queue.dispatcher.state.resource.playbackDuration || 0);

                    const size = 11;
                    const line = '▬';
                    const slider = '🔘';

                    if (!total) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (!current) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(total)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(current)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });
                    if (isNaN(size)) return res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: '0%' });

                    if (current > total) {
                        const bar = line.repeat(size + 2);
                        const percentage = (current / total) * 100;

                        return res({ bar: bar, percents: `${percentage}%` });
                    } else {
                        const percentage = current / total;
                        const progress = Math.round((size * percentage));
                        const emptyProgress = size - progress;
                        const progressText = line.repeat(progress).replace(/.$/, slider);
                        const emptyProgressText = line.repeat(emptyProgress);
                        const bar = progressText + emptyProgressText;
                        const calculated = Math.floor(percentage * 100);

                        if (calculated < 5) {
                            res({ bar: '🔘▬▬▬▬▬▬▬▬▬▬', percents: `${calculated}%` });
                        } else {
                            res({ bar: bar, percents: `${calculated}%` });
                        }
                    }
                }
            }
        })
    }

    /**
     * Method for changing the playback volume of songs
     * @param {Guild} guild Discord Guild
     * @param {Number} volume Playback Volume
     * @returns {Promise<{ status: Boolean, volume: Number }>} Returns the volume setting status and value
    */
    setVolume(guild, volume) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            if(isNaN(volume)) return rej(new PlayerError(PlayerErrors.default.invalidValue.replace('{value}', 'volume').replace('{type}', 'number')));

            switch(this.mode) {
                case 'v12': {
                    queue.volume = Number(volume);
                    queue.connection.dispatcher.setVolumeLogarithmic(Number(volume) / this.options.defaultVolume);

                    return res({ status: true, volume: volume });
                }

                case 'v13': {
                    queue.volume = Number(volume);
                    queue.dispatcher.state.resource.volume.setVolume(Number(volume) / this.options.defaultVolume);

                    return res({ status: true, volume: volume });
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
                case 'v12': {
                    queue.songs = [];
                    queue.voiceChannel.leave();
                    this.queue.delete(guild.id);

                    return res({ status: true });
                }

                case 'v13': {
                    if(queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
                        queue.songs = [];
                        this.queue.delete(guild.id);

                        return res({ status: true });
                    }else{
                        queue.connection.destroy();
                        queue.songs = [];
                        this.queue.delete(guild.id);

                        return res({ status: true });
                    }
                }
            }
        })
    }

    /**
     * Method for setting to repeat server queue songs
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{ status: Boolean, songs: Array<PlayerSong> }>} Returns the loop status of a queue and information about it
    */
    setLoopQueue(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            if(this.options.synchronLoop) {
                queue.loop.queue = !queue.loop.queue;
                if(queue.loop.song) queue.loop.song = !queue.loop.song;
            }else if(!this.options.synchronLoop){
                queue.loop.queue = !queue.loop.queue;
            }

            return res({ status: queue.loop.queue, songs: queue.songs });
        })
    }

    /**
     * Method to restore playing songs
     * @param {Guild} guild Discord Guilds
     * @returns {Promise<{ status: Boolean }>} Returns the playing status of a queue
    */
    resume(guild) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));
            if(queue.playing) return rej(new PlayerError(PlayerErrors.default.queueResumed.replace('{guildID}', guild.id)));

            switch(this.mode) {
                case 'v12': {
                    queue.playing = true;
                    queue.connection.dispatcher.resume();

                    return res({ status: true });
                }

                case 'v13': {
                    queue.playing = true;
                    queue.dispatcher.unpause();

                    return res({ status: true });
                }
            }
        })
    }

    /**
     * Method for removing songs from the queue by Name or Index
     * @param {Guild} guild Discord Guild
     * @param {String | Number} value Song Name or Song Index
     * @returns {Promise<{ status: Boolean, song: PlayerSong, queue: Array<PlayerSong> }>} Returns the song deletion status and information about it
    */
    removeSong(guild, value) {
        return new Promise(async (res, rej) => {
            const queue = this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            if(!isNaN(value)) {
                const index = Math.floor(value - 1);
                const song = queue.songs[index];

                if(!song) return rej(new PlayerError(PlayerErrors.default.songNotFound.replace('{value}', value)));
                queue.songs = queue.songs.filter(track => track != song);

                return res({ status: true, song: song, queue: queue.songs });
            }else{
                const title = value;
                const song = queue.songs.find(track => track.title === title);

                if(!song) return rej(new PlayerError(PlayerErrors.default.songNotFound.replace('{value}', title)));
                queue.songs = queue.songs.filter(track => track != song);

                return res({ status: true, song: song, queue: queue.songs });
            }
        })
    }

    /**
     * Method for initializing the module
     * @returns {void}
     * @private
    */
    init() {
        this.ready = true;
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} [searchResultsLimit=10] Limit the number of results when searching for songs
 * @property {Boolean} [synchronLoop=true] Song/Queue loop auto sync status
 * @property {Number} [defaultVolume=5] Default value of playback volume
 * @property {Object} [collectorsConfig] CollectorsManager Configuration
 * @property {Boolean} [collectorsConfig.autoAddingSongs=true] Status of automatically adding songs to the queue from the collector
 * @property {Number} [collectorsConfig.maxAttempts=1] Maximum number of attempts to collect valid values
 * @property {String} [collectorsConfig.time=1m] Time during which the collector will collect values
 * @type {Object}
*/

/**
 * @typedef PlayerSong
 * @property {Number} [index] Song Index
 * @property {String} searchType Song Search Type
 * @property {String} title Song Title
 * @property {String} url Song URL
 * @property {String} thumbnail Song Image
 * @property {String} author Song Channel Author
 * @property {TextChannel} textChannel Guild Text Channel
 * @property {VoiceChannel} voiceChannel Guild Voice Channel
 * @property {User} requestedBy The user who installed the song
 * @property {Object} duration Song Duration
 * @property {String} duration.hours Duration in hours
 * @property {String} duration.minutes Duration in minutes
 * @property {String} duration.seconds Duration in seconds
 * @type {Object}
*/

/**
 * @typedef PlayerQueue
 * @property {TextChannel} textChannel Queue Text Channel
 * @property {VoiceChannel} voiceChannel Queue Voice Channel
 * @property {VoiceConnection} connection Queue Voice Connection
 * @property {AudioPlayer} [dispatcher] Queue Dispatcher
 * @property {Array<PlayerSong>} songs Queue Songs
 * @property {Number} volume Queue Songs Volume
 * @property {Object} loop Loop Object
 * @property {Boolean} loop.song Queue Song Loop
 * @property {Boolean} loop.queue Queue Songs Loop
 * @property {Number} startStream Stream Start Time
 * @property {Boolean} playing Queue Song Playing Status
 * @property {String} filter Queue Songs Filter
 * @type {Object}
*/

/**
 * @typedef PlayerFilter
 * @property {String} name Filter Name
 * @property {String} value Filter FFmpeg Value
 * @type {Object}
*/

/**
 * Emits when the song starts playing
 * @event DiscordPlayerMusic#playingSong
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Queue Text Channel
 * @param {VoiceChannel} callback.voiceChannel Queue Voice Channel
 * @param {VoiceConnection} callback.connection Queue Voice Connection
 * @param {AudioPlayer} callback.dispatcher Queue Dispatcher
 * @param {Array<PlayerSong>} callback.songs Queue Songs
 * @param {Number} callback.volume Queue Songs Volume
 * @param {Object} callback.loop Loop Object
 * @param {Boolean} callback.loop.song Queue Song Loop
 * @param {Boolean} callback.loop.queue Queue Songs Loop
 * @param {Number} callback.startStream Stream Start Time
 * @param {Boolean} callback.playing Queue Song Playing Status
 * @param {String} callback.filter Queue Songs Filter
*/

/**
 * Emits when a song is added to the queue
 * @event DiscordPlayerMusic#songAdded
 * @param {Object} callback Callback
 * @param {Number} callback.index Song Position
 * @param {String} callback.searchType Search Type (URL or Name)
 * @param {String} callback.title Song Title
 * @param {String} callback.url Song URL
 * @param {String} callback.thumbnail Song Thumbnail
 * @param {String} callback.author Song Uploader
 * @param {TextChannel} callback.textChannel Text Channel
 * @param {VoiceChannel} callback.voiceChannel Voice Channel
 * @param {User} callback.requestedBy Requester of the Song
 * @param {Object} callback.duration Song Duration
 * @param {String} callback.duration.hours Duration in hours
 * @param {String} callback.duration.minutes Duration in minutes
 * @param {String} callback.duration.seconds Duration in seconds
*/

/**
 * Emits when the queue ends
 * @event DiscordPlayerMusic#queueEnded
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Queue Text Channel
 * @param {VoiceChannel} callback.voiceChannel Queue Voice Channel
 * @param {VoiceConnection} callback.connection Queue Voice Connection
 * @param {AudioPlayer} callback.dispatcher Queue Dispatcher
 * @param {Array<PlayerSong>} callback.songs Queue Songs
 * @param {Number} callback.volume Queue Songs Volume
 * @param {Object} callback.loop Loop Object
 * @param {Boolean} callback.loop.song Queue Song Loop
 * @param {Boolean} callback.loop.queue Queue Songs Loop
 * @param {Number} callback.startStream Stream Start Time
 * @param {Boolean} callback.playing Queue Song Playing Status
 * @param {String} callback.filter Queue Songs Filter
*/

/**
 * Emits when an error occurs
 * @event DiscordPlayerMusic#playerError
 * @param {Object} callback Callback
 * @param {TextChannel} callback.textChannel Text Channel
 * @param {User} callback.requested Song Requested User
 * @param {String} callback.method Executed Method
 * @param {Error} callback.error Returned Error
*/

module.exports = DiscordPlayerMusic;