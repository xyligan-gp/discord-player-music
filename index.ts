// Import package requirements
import { Client } from "discord.js";

// Import player emitter
import { PlayerEmitter } from "./src/Emitter";

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
 */
class Player extends PlayerEmitter<PlayerEvents> {
    public client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public utils: PlayerUtils;

    /**
     * Creates a new instance of the Player.
     *
     * @constructor
     * 
     * @param {Client} client - The client instance associated with the player.
     * @param {PlayerOptions} [options] - Optional player options.
     */
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

export { Player };

/********************************** PLAYER OPTIONS (DOCS) **********************************/

/**
 * Represents options for the Player.
 *
 * @typedef {object} PlayerOptions
 * 
 * @prop {boolean} [addTracksToQueue=true] Determines whether to add tracks to the queue.
 * @prop {number} [searchResultsCount=10] The number of search results.
 * @prop {boolean} [synchronLoop=true] Determines whether to enable synchronous looping.
 * @prop {number} [defaultVolume=5] The default volume level.
 * @prop {PlayerConfigs} [configs] Additional player configurations.
 */

/**
 * Represents additional configurations for the Player.
 *
 * @typedef {object} PlayerConfigs
 * 
 * @prop {PlayerProgressBarConfig} [progressBar] Configuration for the progress bar.
 * @prop {PlayerCollectorsConfig} [collectors] Configuration for the collectors.
 */

/**
 * Represents the configuration for the progress bar of the Player.
 *
 * @typedef {object} PlayerProgressBarConfig
 * 
 * @prop {number} [size=11] The size of the progress bar.
 * @prop {string} [line=▬] The style of the progress bar line.
 * @prop {string} [slider=🔘] The style of the progress bar slider.
 */

/**
 * Represents the configuration for the collectors of the Player.
 *
 * @typedef {object} PlayerCollectorsConfig
 * 
 * @prop {object} [message] Configuration for message collectors.
 * @prop {string} [message.time=30s] The time duration for message collectors.
 * @prop {number} [message.attempts=1] The number of attempts for message collectors.
 * @prop {object} [reaction] Configuration for reaction collectors.
 * @prop {string} [reaction.time=30s] The time duration for reaction collectors.
 * @prop {number} [reaction.attempts=1] The number of attempts for reaction collectors.
 * @prop {Array<string>} [reaction.reactions] The allowed reactions for reaction collectors.
 */

/********************************** PLAYER EVENTS (DOCS) **********************************/

/**
 * Represents the events for the Player.
 *
 * @typedef {object} PlayerEvents
 * 
 * @prop {Function} ready Event triggered when the player is ready.
 * @prop {Function} error - Event triggered when an error occurs.
 */

/**
 * Event triggered when the player is ready.
 * 
 * @event Player#ready
 */

/**
 * Event triggered when an error occurs.
 * 
 * @event Player#error
 * 
 * @param {PlayerError} error The error object associated with the error event.
 */