// Import all requirements
import { FFmpeg } from "prism-media";
import { StreamType as DiscordStreamType } from "@discordjs/voice";

declare class StreamManager {
    constructor(url: string, options?: StreamOptions);

    public url: string;
    public type: DiscordStreamType;

    private _args: string[];
    private _options: StreamOptions;

    private _stream: FFmpeg;

    /**
     * Start the streaming process using FFmpeg.
     *
     * @returns The FFmpeg instance representing the streaming process.
     */
    public start(): FFmpeg;

    /**
     * Initialize internal settings for streaming.
     */
    private _init(): void;
}

declare enum StreamType {
    OPUS = "opus",
    RAW = "raw"
}

interface StreamOptions {
    type?: StreamType;
    args?: string[];
}

export {
    StreamManager,

    StreamType,
    StreamOptions
}