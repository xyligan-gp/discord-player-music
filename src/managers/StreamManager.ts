// Import all requirements
import { FFmpeg } from "prism-media";
import { StreamType as DiscordStreamType } from "@discordjs/voice";

// Import required interfaces
import { StreamOptions } from "../../types/managers/StreamManager";

/**
 * Player Stream Manager
 * 
 * @class
 * @classdesc Class representing a Stream Manager.
 */
class StreamManager {
    public url: string;
    public type: DiscordStreamType;

    private _args: string[];
    private _options: StreamOptions;
    
    private _stream: FFmpeg;

    /**
     * Creates a new instance of the Player Stream.
     *
     * @constructor
     * 
     * @param {string} url - FFmpeg Stream URL.
     * @param {StreamOptions} [options={}] - Player options.
     */
    constructor(url: string, options: StreamOptions = {}) {
        /**
         * Stream URL
         * 
         * @type {string}
         */
        this.url = url;

        /**
         * Stream Type
         * 
         * @type {DiscordVoice.StreamType}
         */
        this.type = options?.type === StreamType.OPUS ? DiscordStreamType.OggOpus : DiscordStreamType.Raw;

        /**
         * Stream FFmpeg Args
         * 
         * @type {string[]}
         * @private
         */
        this._args = [];

        /**
         * Stream Options
         * 
         * @type {StreamOptions}
         * @private
         */
        this._options = options;

        /**
         * FFmpeg Stream
         * 
         * @type {FFmpeg}
         * @private
         */
        this._stream = null;

        this._init();
    }

    /**
     * Start the streaming process using FFmpeg.
     *
     * @returns {FFmpeg} The FFmpeg instance representing the streaming process.
     */
    public start(): FFmpeg {
        this._stream = new FFmpeg({ shell: false, args: this._args });

        (<any>this._stream)._readableState && ((<any>this._stream)._readableState.highWaterMark = 1 << 25);

        return this._stream;
    }

    /**
     * Initialize internal settings for streaming.
     * 
     * @returns {void}
     * @private
     */
    private _init(): void {
        this._args = [
            "-reconnect",
            "1",
            "-reconnect_streamed",
            "1",
            "-reconnect_delay_max",
            "5",
            "-i",
            this.url,
            "-analyzeduration",
            "0",
            "-loglevel",
            "0",
            "-ar",
            "48000",
            "-ac",
            "2",
            "-f",
        ];

        if(this.type === DiscordStreamType.OggOpus)
            this._args.push("opus", "-acodec", "libopus");
        else
            this._args.push("s16le");

        if(Array.isArray(this._options.args) && this._options?.args?.length) this._args.push(...this._options.args);
    }
}

/**
 * Enum representing different stream types.
 *
 * @typedef {object} StreamType
 * 
 * @prop {string} OPUS Stream type for OPUS-encoded audio.
 * @prop {string} RAW Stream type for raw audio data.
 */
enum StreamType {
    OPUS = "opus",
    RAW = "raw"
}

export {
    StreamManager,
    
    StreamType
}

/**
 * Represents additional configurations for the Player Stream.
 * 
 * @typedef {object} StreamOptions
 * 
 * @prop {StreamType} type The type of the stream (e.g., OPUS or RAW).
 * @prop {string[]} args Additional arguments for the stream.
 */