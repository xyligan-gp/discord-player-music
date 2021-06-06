import { Client, Guild, GuildMember, Message, TextChannel, User, VoiceChannel, VoiceConnection } from 'discord.js';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

declare module 'discord-player-music' {

    /**
     * MusicPlayer Class
     */
    class MusicPlayer extends EventEmitter {
        /**
         * MusicPlayer Version
         */
        public version: string;

        /**
         * MusicPlayer Author
         */
        public author: string;

        /**
         * MusicPlayer Ready Status
         */
        public ready: boolean;

        /**
         * MusicPlayer Constructor
         */
        constructor(client: Client);

        /**
         * Method for playing songs.
         * @param {Guild} guild Discord Guild
         * @param {object} song Song Object
         * @returns {Promise<ModuleEvents['playingSong'] | ModuleEvents['queueEnded']>} Returns the event of the module.
         */
        play(guild: Guild, song: Song): Promise<ModuleEvents['playingSong'] | ModuleEvents['queueEnded']>;

        /**
         * Method to search for songs by user request.
         * @param {GuildMember} member Discord GuildMember
         * @param {String} searchString Search String
         * @param {Message} message Discord Message
         * @returns {Promise<Array<Song>>} Returns a list of found songs.
         */
        searchVideo(member: GuildMember, searchString: string, message: Message): Promise<Array<Song>>;

        /**
         * Method for getting song index.
         * @param {Array<Song>} tracksArray Songs Array
         * @param {Message} message Discord Message
         * @returns {Promise<Number>} Returns the position of the song from the list.
         */
        getSongIndex(tracksArray: Array<Song>, message: Message): Promise<Number>;

        /**
         * Method for adding a song to the server queue.
         * @param {Number} index Song Index
         * @param {Guild} guild Discord Guild
         * @param {Array} tracksArray Songs Array 
         * @param {TextChannel} textChannel Discord TextChannel 
         * @param {VoiceChannel} voiceChannel Discord VoiceChannel 
         * @returns {Promise<ModuleEvents['playingSong'] | ModuleEvents['songAdded']>} Returns the event of the module.
         */
        addSong(index: number, guild: Guild, tracksArray: Array<Song>, textChannel: TextChannel, voiceChannel: VoiceChannel): Promise<ModuleEvents['playingSong'] | ModuleEvents['songAdded']>;

        /**
         * Method for skipping songs in the queue.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<{ status: boolean, song: Song }>} Returns an object with a skip status and a song object.
         */
        skipSong(guild: Guild): Promise<{ status: boolean, song: Song }>;

        /**
         * Method for getting a queue of server songs.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<Arry<Song>>} Returns an array of songs being played on the server.
         */
        getQueue(guild: Guild): Promise<Array<Song>>;

        /**
         * Method for setting the current song to repet from the server queue.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<{ status: boolean, song: Song }>} Returns the song repeat status and object.
         */
        setLoopSong(guild: Guild): Promise<{ status: boolean, song: Song }>;

        /**
         * Method for setting to repeat server queue songs.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<{ status: boolean, songs: Array<Song> }>} Returns the repeat status of the queue and its object.
         */
        setLoopQueue(guild: Guild): Promise<{ status: boolean, songs: Array<Song> }>;

        /**
         * Method for ending playing a queue of songs.
         * @param {Guild} guild Discord Guild 
         * @returns {Promise<boolean>} Returns `true` on success.
         */
        stopPlaying(guild: Guild): Promise<boolean>;

        /**
         * Method to pause song playback.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<boolean>} Returns `true` on success.
         */
        pausePlaying(guild: Guild): Promise<boolean>;

        /**
         * Method to restore playing songs.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<boolean>} Returns `true` on success.
         */
        resumePlaying(guild: Guild): Promise<boolean>;

        /**
         * Method for changing the playback volume of songs.
         * @param {Guild} guild Discord Guild
         * @param {Number} volumeValue Volume Value
         * @returns {Promise<{ status: boolean, volume: Number }>} Returns the volume setting status and value.
         */
        setVolume(guild: Guild, volumeValue: number): Promise<{ status: boolean, volume: number }>;

        /**
         * Method for getting information about the current song.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<{ guildMap: GuildMap, songInfo: Song }>} Returns an object with information about the current song and server queue.
        */
        getCurrentSongInfo(guild: Guild): Promise<{ guildMap: GuildMap, songInfo: Song }>;

        /**
         * Method for joining your bot in voice channel.
         * @param {GuildMember} member Discord GuildMember
         * @returns {Promise<{ status: boolean, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel.
         */
        joinVoiceChannel(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;

        /**
         * Method for left your bot the voice channel.
         * @param {GuildMember} member Discord GuildMember 
         * @returns {Promise<{ status: boolean, voiceChannel: VoiceChannel }>} Returns the status and object of the voice channel.
         */
        leaveVoiceChannel(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;

        /**
         * Method for creating progress bar.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<{ bar: string, percents: string }>} Returns an object with the progress bar data.
         */
        createProgressBar(guild: Guild): Promise<{ bar: string, percents: string }>;

        /**
         * Sets the filter for server queue songs.
         * @param {Guild} guild Discord Guild
         * @param {String} filter Filter Name
         * @returns {Promise<{ status: boolean, filter: string, queue: Array<Song>}>} Returns installation status, filter name and server queue array.
         */
        setFilter(guild: Guild, filter: string): Promise<{ status: boolean, filter: string, queue: Array<Song> }>;

        /**
         * Method for getting guild map.
         * @param {Guild} guild Discord Guild 
         * @returns {Promise<Guild<GuildMap>} Returns an object with server queue parameters.
         */
        getGuildMap(guild: Guild): Promise<GuildMap>;

        /**
         * Method for getting all filters of a module.
         * @returns {Promise<Array<{ name: string, value: string }>>} Returns an array of all filters in the module.
         */
        getFilters(): Promise<Array<{ name: string, value: string }>>;

        /**
         * Method for formatting numbers.
         * @param {Array} numbersArray Numbers Array
         * @returns {Array<Number>} Returns an array with formatted numbers.
         */
        formatNumbers(numbersArray: Array<Number>): Array<String>;

        /**
         * Starts the song stream.
         * @param {Guild} guild Discord Guild
         * @returns {Promise<Readable>} Returns a new stream object.
         */
        private createStream(guild: Guild): Promise<Readable>;

        /**
         * Method for initialization module.
         * @returns {void} Module Status
         */
        private initPlayer(): void;

        on<K extends keyof ModuleEvents>(
            event: K,
            listener: (...args: ModuleEvents[K][]) => void
        ): this;

        emit<K extends keyof ModuleEvents>(event: K, ...args: ModuleEvents[K][]): boolean;
    }

    class MusicPlayerError extends Error {
        /**
         * Name of the Error
         */
        public name: 'MusicPlayerError'

        /**
         * Class Constructor
         */
        constructor(message: string | Error) { }
    }

    namespace MusicPlayer {
        declare const version: '1.0.3'
    }
    export = MusicPlayer;
}

/**
 * PlayerError
 */
interface PlayerError {
    /**
     * Discord TextChannel
     */
    textChannel: TextChannel;

    /**
     * Modulle Method
     */
    method: string;

    /**
     * Error
     */
    error: Error;
}

/**
 * Guild Queue Object
 */
interface GuildMap {
    /**
     * Discord TextChannel
     */
    textChannel: TextChannel;

    /**
     * Discord VoiceChannel
     */
    voiceChannel: VoiceChannel;

    /**
     * Discord VoiceConnection
     */
    connection: VoiceConnection;

    /**
     * Guild Songs Array
     */
    songs: [{ index: number, searchType: string, title: string, url: string, thumbnail: string, author: string, textChannel: TextChannel, voiceChannel: VoiceChannel, requestedBy: User, duration: { hours: string | number; minutes: string | number; seconds: string | number } }];

    /**
     * Playback volume
     */
    volume: number;

    /**
     * Loop Song Status
     */
    loop: boolean;

    /**
     * Loop Queue Status
     */
    queueLoop: boolean;

    /**
     * Playing Status
     */
    playing: boolean;

    /**
     * Playback filter
     */
    filter: string | null;
}

/**
 * Song Object
 */
interface Song {
    /**
     * Song index in searched tracks
     */
    index: number;

    /**
     * Search type
     */
    searchType: string;

    /**
     * Song Title
     */
    title: string;

    /**
     * Song URL
     */
    url: string;

    /**
     * Song Thumbnail URL
     */
    thumbnail: string;

    /**
     * Song Author
     */
    author: string;

    /**
     * Discord TextChannel
     */
    textChannel: TextChannel;

    /**
     * Discord VoiceChannel
     */
    voiceChannel: VoiceChannel;

    /**
     * Song requested
     */
    requestedBy: User;

    /**
     * Song Duration
     */
    duration: { hours: string | number; minutes: string | number; seconds: string | number };
}

/**
 * MusicPlayer Events
 */
interface ModuleEvents {
    /**
     * Emits when the song starts playing.
     */
    playingSong: GuildMap;

    /**
     * Emits when a song is added to the queue.
     */
    songAdded: Song;

    /**
     * Emits when the queue ends.
     */
    queueEnded: GuildMap;

    /**
     * Emits when an error occurs.
     */
    playerError: PlayerError;
}