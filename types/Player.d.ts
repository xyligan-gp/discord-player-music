// Import package requirements
import { Client, Collection } from "discord.js";

// Import package emitter
import { PlayerEmitter } from "./Emitter";

// Import error class
import { PlayerError } from "./Error";

// Import player managers
import { VoiceManager } from "./managers/VoiceManager";
import { GuildQueueTrack, PlayerPlaylist, QueueManager } from "./managers/QueueManager";

declare class Player extends PlayerEmitter<PlayerEvents> {
    constructor(client: Client, options?: PlayerOptions);

    private client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public voice: VoiceManager;

    public queue: Collection<string, QueueManager>;

    /**
     * Player Ready State
     */
    public get isReady(): boolean;

    /**
     * Player Developer
     */
    public get developer(): string;

    /**
     * Player Documentation URL
     */
    public get docs(): string;

    /**
     * Player Version
     */
    public get version(): string;

    /**
     * Search for tracks based on a query.
     *
     * @param query - The query to search for.
     * @param requestedUser - The user who made the request.
     * 
     * @returns Array of track information.
     */
    public searchTracks(query: string, requestedUser?: User): Promise<GuildQueueTrack[]>;

    /**
     * Fetch tracks from a playlist specified by a URL.
     *
     * @param playlistURL - The URL of the playlist to fetch tracks from.
     * @param requestedUser - The user who made the request.
     * 
     * @returns Object with information about playlist and array of track information.
     */
    public fetchPlaylist(playlistURL: string, requestedUser?: User): Promise<PlayerPlaylist>;

    /**
     * Fetch lyrics for a track based on a query.
     *
     * @param query - The query for which to fetch lyrics.
     * 
     * @returns Object representing the fetched lyrics.
     */
    public fetchLyrics(query: string): Promise<PlayerLyrics>;

    /**
     * Get the guild queue for a specific guild ID.
     *
     * @param guildId - The ID of the guild.
     * 
     * @returns The queue object for the specified guild, or null if not found.
     */
    public getQueue(guildId: string): QueueManager;

    /**
     * Initializes the package.
     */
    private _init(): void;
}

interface PlayerLyrics {
    id: number;
    url: string;
    title: string;
    thumbnail: string;

    text: string;
}

interface PlayerEvents {
    ready: [player: Player];
    error: [error: PlayerError];
}

interface PlayerOptions {
    /**
     * Determines whether to add tracks to the queue.
     * 
     * @default true
     */
    addTracksToQueue?: boolean;

    /**
     * The number of search results.
     * 
     * @default 10
     */
    searchResultsCount?: number;

    /**
     * The default volume level.
     * 
     * @default 5
     */
    defaultVolume?: number;

    /**
     * The default Genius API Key (only for lyrics).
     * 
     * @default ""
     */
    geniusApiKey?: string;

    /**
     * Additional player configurations.
     */
    configs?: PlayerConfigs;
}

interface PlayerConfigs {
    /**
     * Configuration for the progress bar.
     */
    progressBar?: PlayerProgressBarConfig;

    /**
     * Configuration for the collectors.
     */
    collectors?: PlayerCollectorsConfig;
}

interface PlayerProgressBarConfig {
    /**
     * The size of the progress bar.
     * 
     * @default 11
     */
    size?: number;

    /**
     * The style of the progress bar line.
     * 
     * @default ▬
     */
    line?: string;

    /**
     * The style of the progress bar slider.
     * 
     * @default 🔘
     */
    slider?: string;
}

interface PlayerCollectorsConfig {
    /**
     * Configuration for message collectors.
     */
    message?: {
        /**
         * The time duration for message collectors.
         * 
         * @default 30s
         */
        time?: string;

        /**
         * The number of attempts for message collectors.
         * 
         * @default 1
         */
        attempts?: number;
    }

    /**
     * Configuration for reaction collectors.
     */
    reaction?: {
        /**
         * The time duration for reaction collectors.
         * 
         * @default 30s
         */
        time?: string;

        /**
         * The number of attempts for reaction collectors.
         * 
         * @default 1
         */
        attempts?: number;

        /**
         * The allowed reactions for reaction collectors.
         */
        reactions?: Array<string>;
    }
}

export {
    Player,
    PlayerLyrics,
    PlayerEvents,
    PlayerOptions,

    PlayerConfigs,
    PlayerCollectorsConfig,
    PlayerProgressBarConfig
}