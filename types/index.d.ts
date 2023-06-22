// Import package requirements
import { TypedEmitter } from "tiny-typed-emitter";
import { Client } from "discord.js";

// Import package utils
import { PlayerUtils } from "./Utils";

declare class Player extends TypedEmitter<PlayerEvents> {
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
    test: (arg: string, arg2: number, arg3: boolean) => void;
}

interface PlayerOptions {
    addTracksToQueue?: boolean;
    searchResultsCount?: number;
    synchronLoop?: boolean;
    defaultVolume?: number;

    configs?: PlayerConfigs;
}

interface PlayerConfigs {
    progressBar?: PlayerProgressBarConfig;
    collectors?: PlayerCollectorsConfig;
}

interface PlayerProgressBarConfig {
    size?: number;
    line?: string;
    slider?: string;
}

interface PlayerCollectorsConfig {
    message?: {
        time?: string;
        attempts?: number;
    }

    reaction?: {
        time?: string;
        attempts?: number;
        reactions?: Array<string>;
    }
}

export { Player, PlayerEvents, PlayerOptions }