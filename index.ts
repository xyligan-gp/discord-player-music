// Import package requirements
import { TypedEmitter } from "tiny-typed-emitter"
import { Client } from "discord.js";

// Import package utils
import { PlayerUtils } from "./src/Utils";

// Import package interfaces
import { PlayerEvents, PlayerOptions } from "./types/index";

// Import package data
import { author, homepage, version } from "./package.json";

/**
 * Player Class
 * 
 * @class
 * @classdesc Player Main Class
 * 
 * @extends {TypedEmitter<PlayerEvents>}
 */
class Player extends TypedEmitter<PlayerEvents> {
    public client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public utils: PlayerUtils;

    constructor(client: Client, options?: PlayerOptions) {
        super();

        /**
         * Discord client
         * 
         * @type {Client}
         * @private
         */
        this.client = client;

        /**
         * Player utils
         * 
         * @type {PlayerUtils}
         */
        this.utils = new PlayerUtils();

        /**
         * Player options
         * 
         * @type {PlayerOptions}
         */
        this.options = this.utils.checkOptions(options);

        /**
         * Package ready timestamp
         * 
         * @type {number}
         */
        this.readyTimestamp = null;

        this.init();
    }

    /**
     * Package ready state
     * 
     * @type {boolean}
     */
    public get isReady(): boolean {
        return this.readyTimestamp != null;
    }
    
    /**
     * Get package author
     * 
     * @type {string}
     */
    public get author(): string {
        return author;
    }

    /**
     * Get package homepage url
     * 
     * @type {string}
     */
    public get homepage(): string {
        return homepage;
    }

    /**
     * Get package version
     * 
     * @type {string}
     */
    public get version(): string {
        return version;
    }

    /**
     * Initializes the package.
     * 
     * @returns {void}
     * 
     * @private
     */
    private init(): void {
        const interval = setInterval(() => {
            if(this.client.isReady()) {
                this.readyTimestamp = Date.now();

                this.emit("ready");

                clearInterval(interval);
            }
        }, 100)
    }
}

export { Player }