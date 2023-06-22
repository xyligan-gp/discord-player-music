// Import package requirements
import { Client } from "discord.js";

// Import package emitter
import { PlayerEmitter } from "./Emitter";

// Import error class
import { PlayerError } from "./Error";

// Import package utils
import { PlayerUtils } from "./Utils";

declare class Player extends PlayerEmitter<PlayerEvents> {
    constructor(client: Client, options?: PlayerOptions);

    private client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public utils: PlayerUtils;

    /**
     * Package ready state
     * 
     * @type {boolean}
     */
    public get isReady(): boolean;

    /**
     * Get package author
     * 
     * @returns {string} Package author
     */
    public get author(): string;

    /**
     * Get package homepage url
     * 
     * @returns {string} Package homepage url
     */
    public get homepage(): string;

    /**
     * Get package version
     * 
     * @returns {string} Package version
     */
    public get version(): string;

    /**
     * Initializes the package.
     */
    private init(): void;
}

interface PlayerEvents {
    ready: () => void;
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