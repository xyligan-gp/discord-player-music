import errors from '../src/data/errors.json';

import { PlaylistsManager } from './managers/PlaylistsManager';
import { DatabaseManager } from './managers/DatabaseManager';
import { FiltersManager } from './managers/FiltersManager';
import { QueueManager } from './managers/QueueManager';
import { VoiceManager } from './managers/VoiceManager';
import { UtilsManager } from './managers/UtilsManager';

import { PlayerEmitter } from './PlayerEmitter';

import { PlayerEvents } from './PlayerEvents';
import { PlayerOptions } from './PlayerOptions';
import { CollectorData, ErrorData, PlayerFilters, LyricsData, PlayerTrack } from './PlayerData';

import { Client, GuildMember, Message, TextChannel } from 'discord.js';

export type Awaitable<T> = T | PromiseLike<T>;

export enum Collector {
    MESSAGE = 'COLLECTOR_MESSAGE',
    REACTION = 'COLLECTOR_REACTION'
}

export enum Events {
    READY = 'ready',
    ERROR = 'error',
    TRACK_ADD = 'addedTrack',
    TRACK_PLAYING = 'playingTrack',
    PLAYLIST_CREATED = 'createdPlaylist',
    PLAYLIST_DELETED = 'deletedPlaylist',
    QUEUE_STARTED = 'queueStarted',
    QUEUE_ENDED = 'queueEnded',
    QUEUE_STATE = 'queueStateChange'
}

export enum GuildQueueState {
    PAUSED = 'STATE_PAUSED',
    PLAYING = 'STATE_PLAYING'
}

export enum Loop {
    QUEUE = 'LOOP_QUEUE',
    TRACK = 'LOOP_TRACK'
}

export enum Search {
    URL = 'SEARCH_URL',
    TITLE = 'SEARCH_TITLE'
}

export declare class Player extends PlayerEmitter {
    constructor(client: Client, options?: PlayerOptions);

    /**
     * Discord Client
     */
    private client: Client;

    /**
     * Player Ready Status
     */
    private ready: boolean;

    /**
     * Player Ready Timestamp
     */
    private readyTimestamp: number;

    /**
     * Player Author
     */
    public author: string;

    /**
     * Player Website URL
     */
    public website: string;

    /**
     * Player Version
     */
    public version: string;

    /**
     * Player Utils Manager
     */
    public utils: UtilsManager;

    /**
     * Player Errors JSON
     */
    public errors: typeof errors;

    /**
     * Player Options
     */
    public options: PlayerOptions;

    /**
     * Player Queue Manager
     */
    public queue: QueueManager;

    /**
     * Player Voice Manager
     */
    public voice: VoiceManager;

    /**
     * Player Filters Manager
     */
    public filters: FiltersManager;

    /**
     * Player Database Manager
     */
    public database: DatabaseManager;

    /**
     * Player Playlists Manager
     */
    public playlists: PlaylistsManager;

    /**
     * Player Ready Timestamp
     * 
     * @returns Player ready timestamp
     */
    public get readyAt(): number;

    /**
     * Player is ready?
     * 
     * @returns Player ready status
     */
    public get isReady(): boolean;

    /**
     * Allows you to initialize the next track for playback
     * 
     * @param guildID Discord Guild ID
     * @param track Track info
     * 
     * @returns Void or error object
     */
    private initGuildTrack(guildID: string, track: PlayerTrack): Promise<void & ErrorData>;

    /**
     * Allows you to search for tracks in YouTube by link/title
     * 
     * @param query Search query
     * @param member Discord Guild Member
     * @param channel Discord Guild Text Channel
     * @param isPlaylist Search type
     * 
     * @returns Array with search results or error object
     */
    public search(query: string, member: GuildMember, channel: TextChannel, isPlaylist?: boolean): Promise<PlayerTrack[] & ErrorData>;

    /**
     * Allows you to find lyrics for songs by their name
     * 
     * @param query Track name
     * 
     * @returns Returns a result or error object
     */
    public lyrics(query: string): Promise<LyricsData & ErrorData>;

    /**
     * Allows you to add tracks to the playback queue
     * 
     * @param index Track index
     * @param results Array with search results
     */
    public initQueueTrack(index: number, results: PlayerTrack[]): Promise<void>;
    
    /**
     * Allows you to create a collector to select a track from a list
     * 
     * @param type Collector type
     * @param message Discord Guild Message
     * @param results Search results
     * @param userID Requested user ID
     * 
     * @returns Object with received data or error
     */
    public createCollector(type: Collector, message: Message, results: PlayerTrack[], userID?: string): Promise<CollectorData & ErrorData>;

    /**
     * Method for initializing module
     */
    private init(): void;

    public on<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K]) => Awaitable<void>): this;
    public on<S extends string | symbol>(
      event: Exclude<S, keyof PlayerEvents>,
      listener: (...args: any[]) => Awaitable<void>,
    ): this;

    public once<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K]) => Awaitable<void>): this;
    public once<S extends string | symbol>(
      event: Exclude<S, keyof PlayerEvents>,
      listener: (...args: any[]) => Awaitable<void>,
    ): this;

    public emit<K extends keyof PlayerEvents>(event: K, ...args: PlayerEvents[K]): boolean;
    public emit<S extends string | symbol>(event: Exclude<S, keyof PlayerEvents>, ...args: unknown[]): boolean;
}