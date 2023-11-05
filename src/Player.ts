// Import package requirements
import ytdl from "ytdl-core";
import ytsearch from "yt-search";
import { Client, Collection, User } from "discord.js";

// Import player emitter
import { PlayerEmitter } from "./Emitter";

// Import player utils
import formatNumber from "./util/formatNumber.function";
import { checkOptions } from "./util/checkOptions.function";

// Import player managers
import { VoiceManager } from "./managers/VoiceManager";

// Import package interfaces
import { PlayerEvents, PlayerOptions } from "../types/index";
import { GuildQueue, GuildQueueTrack } from "../types/managers/GuildQueueManager";

// Import package data
import { author, homepage, version } from "../package.json";

/**
 * Player Main Class
 * 
 * @class
 * @classdesc Class representing a Player.
 * 
 * @extends {PlayerEmitter<PlayerEvents>}
 */
class Player extends PlayerEmitter<PlayerEvents> {
    public client: Client;
    public options: PlayerOptions;
    public readyTimestamp: number;

    public voice: VoiceManager;

    public queue: Collection<string, GuildQueue>;

    /**
     * Creates a new instance of the Player.
     *
     * @constructor
     * 
     * @param {Client} client - The client instance associated with the player.
     * @param {PlayerOptions} [options] - Player options.
     */
    constructor(client: Client, options?: PlayerOptions) {
        super();

        /**
         * Discord Client
         * 
         * @type {Client}
         * @private
         */
        this.client = client;

        /**
         * Player Options
         * 
         * @type {PlayerOptions}
         */
        this.options = checkOptions(options);

        /**
         * Player Ready Timestamp
         * 
         * @type {number}
         */
        this.readyTimestamp = null;

        /**
         * Player Voice Manager
         * 
         * @type {VoiceManager}
         */
        this.voice = null;

        /**
         * Player Queue Storage
         * 
         * @type {Collection<string, GuildQueue>}
         */
        this.queue = null;

        this.init();
    }

    /**
     * Player Ready State
     * 
     * @type {boolean}
     */
    public get isReady(): boolean {
        return this.readyTimestamp != null;
    }
    
    /**
     * Player Developer
     * 
     * @type {string}
     */
    public get developer(): string {
        return author;
    }

    /**
     * Player Documentation URL
     * 
     * @type {string}
     */
    public get docs(): string {
        return homepage;
    }

    /**
     * Player Version
     * 
     * @type {string}
     */
    public get version(): string {
        return version;
    }

    /**
     * Search for tracks based on a query.
     *
     * @param {string} query - The query to search for.
     * @param {User} [requestedUser=null] - The user who made the request.
     * 
     * @returns {Promise<GuildQueueTrack[]>} Array of track information.
     */
    public async searchTracks(query: string, requestedUser: User = null): Promise<GuildQueueTrack[]> {
        const isURL = (/((http[s]?:\/|http[s]?:\/\/|www\.)[^\s]+)/gi).test(query);

        const results: GuildQueueTrack[] = [];

        if(isURL) {
            const track = await ytdl.getInfo(query);
            const trackDetails = track.videoDetails;

            results.push(
                {
                    searchType: "search#url",
                        
                    url: trackDetails.video_url,
                    title: trackDetails.title,
                    thumbnail: trackDetails.thumbnails[0].url,

                    author: {
                        url: trackDetails.author.channel_url,
                        name: trackDetails.author.name
                    },

                    duration: {
                        hours: formatNumber(Math.floor(parseInt(trackDetails.lengthSeconds) / 3600)),
                        minutes: formatNumber(Math.floor(parseInt(trackDetails.lengthSeconds) / 60 % 60)),
                        seconds: formatNumber(Math.floor(parseInt(trackDetails.lengthSeconds) % 60))
                    },
                    
                    requested: requestedUser
                }
            )
        }else{
            const searchResults = await ytsearch(query);

            for(let i = 0; i < this.options.searchResultsCount; i++) {
                const trackDetails = searchResults.videos[i];

                results.push(
                    {
                        searchType: "search#title",

                        url: trackDetails.url,
                        title: trackDetails.title,
                        thumbnail: trackDetails.thumbnail,

                        author: {
                            url: trackDetails.author.url,
                            name: trackDetails.author.name
                        },

                        duration: {
                            hours: formatNumber(Math.floor(trackDetails.duration.seconds / 3600)),
                            minutes: formatNumber(Math.floor(trackDetails.duration.seconds / 60 % 60)),
                            seconds: formatNumber(Math.floor(trackDetails.duration.seconds % 60))
                        },

                        requested: requestedUser
                    }
                )
            }
        }

        return results;
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

                this.voice = new VoiceManager();

                this.queue = new Collection();

                this.emit("ready", this as any);

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
 * @prop {Function} error Event triggered when an error occurs.
 */

/**
 * Event triggered when the player is ready.
 * 
 * @event Player#ready
 * 
 * @param {Player} player The Player instance associated with the ready event.
 */

/**
 * Event triggered when an error occurs.
 * 
 * @event Player#error
 * 
 * @param {PlayerError} error The error object associated with the error event.
 */

/**
 * Represents a track in the Guild Queue.
 *
 * @typedef {object} GuildQueueTrack
 * 
 * @prop {string} searchType The type of search ("search#url" or "search#title").
 * @prop {string} url The URL of the track.
 * @prop {string} title The title of the track.
 * @prop {string} thumbnail The thumbnail URL of the track.
 * @prop {GuildQueueTrackAuthor} author The author of the track.
 * @prop {GuildQueueTrackDuration} duration The duration of the track.
 * @prop {User} requested The user who requested the track.
 */

/**
 * Represents an author of a track in the guild queue.
 * 
 * @typedef {object} GuildQueueTrackAuthor
 * 
 * @prop {string} url The URL of the author, such as a channel URL.
 * @prop {string} name The name of the author.
 */

/**
 * Represents the duration of a Guild Queue track.
 *
 * @typedef {object} GuildQueueTrackDuration
 * 
 * @prop {string} hours The hours component of the duration.
 * @prop {string} minutes The minutes component of the duration.
 * @prop {string} seconds The seconds component of the duration.
 */

/**
 * Represents the Guild Queue.
 *
 * @typedef {object} GuildQueue
 * 
 * @prop {number} startTimestamp The start timestamp of the Guild Queue.
 * @prop {number} endTimestamp The end timestamp of the Guild Queue.
 * @prop {GuildQueueRepeat} repeat The repeat settings of the Guild Queue.
 * @prop {GuildQueueChannel} channel The channel settings of the Guild Queue.
 * @prop {GuildQueuePlayback} playback The playback settings of the Guild Queue.
 * @prop {AudioPlayer} dispatcher The AudioPlayer instance associated with the Guild Queue.
 * @prop {VoiceConnection} connection The VoiceConnection instance associated with the Guild Queue.
 * @prop {GuildQueueTrack[]} tracks The tracks in the Guild Queue.
 */

/**
 * Represents the channel settings of the Guild Queue.
 *
 * @typedef {object} GuildQueueChannel
 * 
 * @prop {PlayerTextChannel} text The text channel associated with the Guild Queue.
 * @prop {PlayerVoiceChannel} voice The voice channel associated with the Guild Queue.
 */

/**
 * Represents the playback settings of the Guild Queue.
 *
 * @typedef {object} GuildQueuePlayback
 * 
 * @prop {null} state The state of playback (null).
 * @prop {null} filter The filter applied to playback (null).
 * @prop {number} volume The volume level of playback.
 */

/**
 * Represents the repeat settings of the Guild Queue.
 *
 * @typedef {object} GuildQueueRepeat
 * 
 * @prop {boolean} track Determines if track repeat is enabled.
 * @prop {boolean} queue Determines if queue repeat is enabled.
 */

/**
 * Represents a text channel associated with the player.
 *
 * @typedef {(NewsChannel | StageChannel | TextChannel | PrivateThreadChannel | PublicThreadChannel<boolean> | VoiceChannel)} PlayerTextChannel
 */

/**
 * Represents a voice channel associated with the player.
 *
 * @typedef {(VoiceChannel|StageChannel)} PlayerVoiceChannel
 */