import { Client, Guild, GuildMember, TextChannel, User, VoiceChannel, VoiceConnection } from 'discord.js';
import { EventEmitter } from 'events';

declare module 'discord-player-music' {
    class MusicPlayer extends EventEmitter {
        constructor(client: Client);

        /**
         * MusicPlayer Version
        */
        public version: string;

        /**
         * MusicPlayer Author
        */
        public author: string;

        /**
         * MusicPlayer Documentation Link
        */
        public docs: string;

        /**
         * MusicPlayer Ready Status
        */
        public ready: boolean;

        /**
         * MusicPlayer Client
        */
        public client: Client;

        /**
         * MusicPlayer Utils
        */
        public utils: Utils;

        /**
         * Method for playing songs
         * @param guild Discord Guild
         * @param song Song Object
        */
        play(guild: Guild, song: Song): void;

        /**
         * Method to search for songs by user request
         * @param member Discord GuildMember
         * @param searchString Search String
         * @param channel Discord Text Channel
         * @returns Returns a list of found songs
        */
        searchSong(member: GuildMember, searchString: string, channel: TextChannel): Promise<Array<Song>>;

        /**
         * Method for getting song index
         * @param tracksArray Songs Array
         * @param member Discord GuildMember
         * @param channel Discord Text Channel
         * @returns {Promise<Number>} Returns the position of the song from the list
        */
        getSongIndex(tracksArray: Array<Song>, member: GuildMember, channel: TextChannel): Promise<Number>;

        /**
         * Method for adding a song to the server queue
         * @param index Song Index
         * @param guild Discord Guild
         * @param tracksArray Songs Array
         * @param textChannel Discord TextChannel
         * @param voiceChannel Discord VoiceChannel
        */
        addSong(index: number, guild: Guild, tracksArray: Array<Song>, textChannel: TextChannel, voiceChannel: VoiceChannel): void;

        /**
         * Method for skipping songs in the queue
         * @param guild Discord Guild
         * @returns Returns an object with a skip status and a song object
        */
        skipSong(guild: Guild): Promise<{ status: boolean, song: Song }>;

        /**
         * Method for getting a queue of server songs
         * @param guild Discord Guild
         * @returns Returns an array of songs being played on the server
        */
        getQueue(guild: Guild): Promise<Array<Song>>;

        /**
         * Method for setting the current song to repet from the server queue
         * @param guild Discord Guild
         * @returns Returns the song repeat status and object
        */
        setLoopSong(guild: Guild): Promise<{ status: boolean, song: Song }>;

        /**
         * Method for setting to repeat server queue songs
         * @param guild Discord Guild
         * @returns Returns the repeat status of the queue and its object
        */
        setLoopQueue(guild: Guild): Promise<{ status: boolean, songs: Array<Song> }>;

        /**
         * Method for ending playing a queue of songs
         * @param guild Discord Guild 
         * @returns Returns `true` on success
        */
        stopPlaying(guild: Guild): Promise<boolean>;

        /**
         * Method to pause song playback
         * @param guild Discord Guild
         * @returns Returns `true` on success
        */
        pausePlaying(guild: Guild): Promise<boolean>;

        /**
         * Method to restore playing songs
         * @param guild Discord Guild
         * @returns Returns `true` on success
        */
        resumePlaying(guild: Guild): Promise<boolean>;

        /**
         * Method for changing the playback volume of songs
         * @param guild Discord Guild
         * @param volumeValue Volume Value
         * @returns Returns the volume setting status and value
        */
        setVolume(guild: Guild, volumeValue: number): Promise<{ status: boolean, volume: number }>;

        /**
         * Method for getting information about the current song
         * @param guild Discord Guild
         * @returns Returns an object with information about the current song and server queue
        */
        getCurrentSongInfo(guild: Guild): Promise<{ guildMap: GuildMap, songInfo: Song }>;

        /**
         * Method for joining your bot in voice channel
         * @param member Discord GuildMember
         * @returns Returns the status and object of the voice channel
        */
        joinVoiceChannel(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;

        /**
         * Method for left your bot the voice channel
         * @param member Discord GuildMember 
         * @returns Returns the status and object of the voice channel
        */
        leaveVoiceChannel(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;

        /**
         * Method for creating progress bar
         * @param guild Discord Guild
         * @returns Returns an object with the progress bar data
        */
        createProgressBar(guild: Guild): Promise<{ bar: string, percents: string }>;

        /**
         * Sets the filter for server queue songs
         * @param guild Discord Guild
         * @param filter Filter Name
         * @returns Returns installation status, filter name and server queue array
        */
        setFilter(guild: Guild, filter: string): Promise<{ status: boolean, filter: string, queue: Array<Song> }>;

        /**
         * Method for getting guild map
         * @param guild Discord Guild 
         * @returns Returns an object with server queue parameters
        */
        getGuildMap(guild: Guild): Promise<GuildMap>;

        /**
         * Method for getting all filters of a module
         * @returns Returns an array of all filters in the module
        */
        getFilters(): Promise<Array<{ name: string, value: string }>>;

        /**
         * Method for getting the lyrics of the current song
         * @param guild Discord Guild
         * @returns Returns an object with the name of the song and lyrics to it
        */
        getLyrics(guild: Guild): Promise<{ song: string, lyrics: string }>;

        /**
         * Method for shuffling songs in queue
         * @param guild Discord Guild
         * @returns Returns an object with server queue parameters
        */
        shuffle(guild: Guild): Promise<GuildMap>;

        /**
         * Method for removing songs from the queue by ID/title
         * @param guild Discord Guild
         * @param song_Name_ID Song Index or Name in queue
         * @returns Returns removed song info and song count in queue
        */
        removeSong(guild: Guild, song_Name_ID: string | number): Promise<{ song: Song, songs: number }>;

        /**
         * Method for initialization module
        */
        private initPlayer(): void;

        on<K extends keyof PlayerEvents>(
            event: K,
            listener: (...args: PlayerEvents[K][]) => void
        ): this;

        once<K extends keyof PlayerEvents>(
            event: K,
            listener: (...args: PlayerEvents[K][]) => void
        ): this;

        emit<K extends keyof PlayerEvents>(event: K, ...args: PlayerEvents[K][]): boolean;
    }

    class MusicPlayerError extends Error {
        public name: 'MusicPlayerError'

        constructor(message: string | Error);
    }

    class Utils {
        /**
         * Method for formatting numbers
         * @param numbersArray Numbers Array
         * @returns Returns an array with formatted numbers
        */
        formatNumbers(numbersArray: Array<Number>): Array<String>;

        /**
         * Starts the song stream
         * @param guild Discord Guild
        */
        createStream(guild: Guild): void;
    }

    namespace MusicPlayer {
        const version: '1.1.3'
    }

    export = MusicPlayer;
}

interface PlayerError {
    /**
     * Discord TextChannel
    */
    textChannel: TextChannel;

    /**
     * Song Requested User
    */
    requestedBy: User;

    /**
     * Module Method
    */
    method: string;

    /**
     * Error
    */
    error: Error;
}

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

interface Song {
    /**
     * Song index
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
     * Song Requested User
    */
    requestedBy: User;

    /**
     * Song Duration
    */
    duration: { hours: string | number; minutes: string | number; seconds: string | number };
}

interface PlayerEvents {
    /**
     * Emits when the song starts playing
    */
    playingSong: GuildMap;

    /**
     * Emits when a song is added to the queue
    */
    songAdded: Song;

    /**
     * Emits when the queue ends
    */
    queueEnded: GuildMap;

    /**
     * Emits when an error occurs
    */
    playerError: PlayerError;
}