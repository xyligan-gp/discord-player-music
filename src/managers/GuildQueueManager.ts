// Import manager requirements
import { AudioPlayer, VoiceConnection } from "@discordjs/voice";

// Import manager interfaces
import { GuildQueue, GuildQueueChannel, GuildQueuePlayback, GuildQueueRepeat, GuildQueueTrack } from "../../types/managers/GuildQueueManager";

/**
 * Player Guild Queue Manager
 * 
 * @class
 * @classdesc Class representing a Guild Queue Manager.
 * 
 * @implements {GuildQueue}
 */
class GuildQueueManager implements GuildQueue {
    public startTimestamp: number;
    public endTimestamp: number;

    public repeat: GuildQueueRepeat;
    public channel: GuildQueueChannel;
    public playback: GuildQueuePlayback;

    public dispatcher: AudioPlayer;
    public connection: VoiceConnection;

    public tracks: GuildQueueTrack[];

    /**
     * Creates a new instance of the Player Guild Queue.
     */
    constructor() {
        /**
         * The start timestamp of the queue.
         *
         * @type {number|null}
         */
        this.startTimestamp = null;

        /**
         * The end timestamp of the queue.
         *
         * @type {number|null}
         */
        this.endTimestamp = null;

        /**
         * The repeat settings of the guild queue.
         *
         * @type {GuildQueueRepeat}
         */
        this.repeat = {
            track: false,
            queue: false
        }

        /**
         * The guild channels of the queue.
         *
         * @type {GuildQueueChannel}
         */
        this.channel = {
            text: null,
            voice: null
        }

        /**
         * The playback settings of the guild queue.
         *
         * @type {GuildQueuePlayback}
         */
        this.playback = {
            state: null,
            filter: null,
            volume: 5
        }

        /**
         * The AudioPlayer instance associated with the guild queue.
         *
         * @type {AudioPlayer}
         */
        this.dispatcher = null;

        /**
         * The VoiceConnection instance associated with the guild queue.
         *
         * @type {VoiceConnection}
         */
        this.connection = null;

        /**
         * The tracks in the guild queue.
         *
         * @type {GuildQueueTrack[]}
         */
        this.tracks = [];
    }

    /**
     * Converts the GuildQueueManager instance to a plain object representation.
     *
     * @returns {GuildQueue} The GuildQueue object representation of the GuildQueueManager.
     */
    public toJSON(): GuildQueue {
        return {
            startTimestamp: this.startTimestamp,
            endTimestamp: this.endTimestamp,

            repeat: this.repeat,
            channel: this.channel,
            playback: this.playback,

            dispatcher: this.dispatcher,
            connection: this.connection,

            tracks: this.tracks
        }
    }
}

export { GuildQueueManager };