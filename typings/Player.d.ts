import { Client, Collection, Guild, GuildMember, TextChannel } from 'discord.js';

import Emitter from '../src/Emitter.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';
import { PlayerFilter, PlayerSong, PlayerQueue } from './PlayerData';
import PlayerEvents from './PlayerEvents';

import CollectorsManager from './CollectorsManager';
import QueueManager from './QueueManager';
import UtilsManager from './UtilsManager';
import VoiceManager from './VoiceManager';

declare class DiscordPlayerMusic extends Emitter {
    constructor(client: Client, options?: DiscordPlayerMusicOptions);

    public client: Client;
    public ready: boolean;
    public options: DiscordPlayerMusicOptions;
    public docs: string;
    public version: string;
    public author: string;
    public mode: string;
    public managers: Array<string>;
    public size: number;
    public filters: Array<PlayerFilter>;

    public collectors: CollectorsManager;
    public queue: Collection<string, QueueManager>;
    public utils: UtilsManager;
    public voice: VoiceManager;

    /**
     * Method for playing songs on the server
     * @param guild Discord Guild
     * @param song Song Info
    */
    public play(guild: Guild, song: PlayerSong): Promise<void>;

    /**
     * Method to search for songs by user query
     * @param member Guild Member
     * @param query Song Name or URL
     * @param channel Guild Text Channel
     * @returns Returns a list of found songs
    */
    public searchSong(member: GuildMember, query: string, channel: TextChannel): Promise<Array<PlayerSong>>;

    /**
     * Method for adding a song to the server queue
     * @param index Song Index
     * @param member Guild Member
     * @param resultsArray Results List
    */
    public addSong(index: number, member: GuildMember, resultsArray: Array<PlayerSong>): Promise<void>;

    /**
     * Method to pause song playback
     * @param guild Discord Guild
     * @returns Returns the pause status of a queue
    */
    public pause(guild: Guild): Promise<{ status: boolean }>;

    /**
     * Method for setting the current song to repet from the server queue
     * @param guild Discord Guild
     * @returns Returns the repeat status of a song and information about it
    */
    public setLoopSong(guild: Guild): Promise<{ status: boolean, song: PlayerSong }>;

    /**
     * Method for skipping songs in the queue
     * @param guild Discord Guild
     * @returns Returns the status of the operation and information about the song
    */
    public skip(guild: Guild): Promise<{ status: boolean, song: PlayerSong }>;

    /**
     * Method for adding filter to play songs
     * @param guild Discord Guild
     * @param filter Filter Name
     * @returns Returns the filter installation status and information about it
    */
    public setFilter(guild: Guild, filter?: string): Promise<{ status: boolean, filter: PlayerFilter, songs: Array<PlayerSong> }>;

    /**
     * Method for shuffling songs in queue
     * @param guild Discord Guild
     * @returns Returns a shuffled server queue
    */
    public shuffle(guild: Guild): Promise<Array<PlayerSong>>;

    /**
     * Method for getting guild map
     * @param guild Discord Guild
     * @returns Returns an object with server queue parameters
    */
    public getGuildMap(guild: Guild): Promise<PlayerQueue>;

    /**
     * Method for getting a queue of server songs
     * @param guild Discord Guild
     * @returns Returns an array of songs being played on the server
    */
    public getQueue(guild: Guild): Promise<Array<PlayerSong>>;
 
    /**
     * Method for getting information about a song
     * @param guild Discord Guild
     * @param index Song Index
     * @returns Returns information about the requested song
    */
    public getSongInfo(guild: Guild, index?: number): Promise<{ song: PlayerSong, dispatcherInfo: { loop: { song: boolean, queue: boolean }, filter: { name: string, value: string }, playing: boolean, streamTime: { days: number | string, hours: number | string, minutes: number | string, seconds: number | string } } }>;
 
    /**
     * Method for finding lyrics for a song
     * @param guild Discord Guild
     * @param query Song Name
     * @returns Returns the lyrics of the requested song
    */
    public getLyrics(guild: Guild, query?: string): Promise<{ song: string | PlayerSong, lyrics: string }>;
 
    /**
     * Method for getting all filters of a module
     * @returns Returns the collection of module filters
    */
    public getFilters(): Promise<Array<PlayerFilter>>;

    /**
     * Method for creating progress bar
     * @param guild Discord Guild
     * @returns Returns an object with the progress bar data
    */
    public createProgressBar(guild: Guild): Promise<{ bar: string, percents: string }>;

    /**
     * Method for changing the playback volume of songs
     * @param guild Discord Guild
     * @param volume Playback Volume
     * @returns Returns the volume setting status and value
    */
    public setVolume(guild: Guild, volume: number): Promise<{ status: boolean, volume: number }>;

    /**
     * Method to end playback of the server queue
     * @param guild Discord Guild
     * @returns Returns the status of the operation
    */
    public stop(guild: Guild): Promise<{ status: boolean }>;

    /**
     * Method for setting to repeat server queue songs
     * @param guild Discord Guild
     * @returns Returns the loop status of a queue and information about it
    */
    public setLoopQueue(guild: Guild): Promise<{ status: boolean, songs: Array<PlayerSong> }>;

    /**
     * Method to restore playing songs
     * @param guild Discord Guild
     * @returns Returns the playing status of a queue
    */
    public resume(guild: Guild): Promise<{ status: boolean }>;

    /**
     * Method for removing songs from the queue by ID/title
     * @param guild Discord Guild
     * @param value Song Name or Song Index
     * @returns Returns the song deletion status and information about it
    */
    public removeSong(guild: Guild, value: string | number): Promise<{ status: boolean, song: PlayerSong, queue: Array<PlayerSong> }>;

    /**
     * Method for initializing the module
    */
    private init(): void;

    on<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K][]) => void): this;
    once<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K][]) => void): this;
    emit<K extends keyof PlayerEvents>(event: K, ...args: PlayerEvents[K][]): boolean;
}

export = DiscordPlayerMusic;