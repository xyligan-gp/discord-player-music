// Import package requirements
import { Client, Collection } from "discord.js";

// Import package emitter
import { PlayerEmitter } from "./Emitter";

// Import error class
import { PlayerError } from "./Error";

// Import package utils
import { PlayerUtils } from "./Utils";

// Import player managers
import { VoiceManager } from "./managers/VoiceManager";
import { GuildQueueTrackDuration } from "./managers/GuildQueueManager";

declare class Player extends PlayerEmitter<PlayerEvents> {
    constructor(client: Client, options?: PlayerOptions);

    private client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public utils: PlayerUtils;

    public voice: VoiceManager;

    public queue: Collection<string, GuildQueueTrackDuration>;

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
     * Initializes the package.
     */
    private init(): void;
}

interface PlayerEvents {
    ready: (player: Player) => void;
    error: (error: PlayerError) => void;
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
     * Determines whether to enable synchronous looping.
     * 
     * @default true
     */
    synchronLoop?: boolean;

    /**
     * The default volume level.
     * 
     * @default 5
     */
    defaultVolume?: number;

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

export { Player, PlayerEvents, PlayerOptions };