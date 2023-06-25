// Import manager requirements
import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { DMChannel, PartialDMChannel, StageChannel, TextBasedChannel, VoiceChannel, User } from "discord.js";

// Import utils
import { RestOrArray } from "../util/normalizeArray";

declare class GuildQueueManager {
    public startTimestamp: number;
    public endTimestamp: number;

    public repeat: GuildQueueRepeat;
    public channel: GuildQueueChannel;
    public playback: GuildQueuePlayback;

    public dispatcher: AudioPlayer;
    public connection: VoiceConnection;

    public tracks: GuildQueueTrack[];

    /**
     * Checks if the queue is empty.
     */
    public get isEmpty(): boolean;

    /**
     * Retrieves the currently playing track from the queue.
     */
    public get nowPlaying(): GuildQueueTrack;

    /**
     * Sets the timestamp value for the specified type in the GuildQueueManager.
     * 
     * @param type - The type of timestamp.
     * @param value - The timestamp value to set. If not provided, the current timestamp will be used.
     * 
     * @returns The GuildQueueManager instance.
     */
    public setTimestamp(type: TimestampType, value?: number): this;

    /**
     * Sets the repeat mode for the GuildQueueManager.
     * 
     * @param type - The repeat mode to set.
     * 
     * @returns The GuildQueueManager instance.
     */
    public setRepeatMode(type: RepeatMode = RepeatMode.DISABLED): this;

    /**
     * Sets the channel for the specified channel type in the GuildQueueManager.
     *
     * @template TChannelType - The channel type (ChannelType.TEXT or ChannelType.VOICE).
     * 
     * @param type - The channel type.
     * @param channel - The channel to set.
     * 
     * @returns The GuildQueueManager instance.
     */
    public setChannel<TChannelType extends ChannelType>(
        type: TChannelType,
        channel: SetChannelType<TChannelType>
    ): this;

    /**
     * Adds tracks to the guild queue.
     *
     * @param tracks - The tracks to add. Accepts both array and variadic arguments.
     * 
     * @returns The GuildQueueManager instance.
     */
    public addTracks(...tracks: RestOrArray<GuildQueueTrack>): this;

    /**
     * Creates a GuildQueueManager instance from the provided GuildQueue data.
     * 
     * @param data - The GuildQueue data.
     * 
     * @returns The created GuildQueueManager instance.
     */
    public static from(data: GuildQueue): this;

    /**
     * Converts the GuildQueueManager instance to a plain object representation.
     *
     * @returns The GuildQueue object representation of the GuildQueueManager.
     */
    public toJSON(): GuildQueue;
}

enum RepeatMode {
    DISABLED,
    TRACK,
    QUEUE
}

interface GuildQueueTrack {
    index: number;
    searchType: "search#url" | "search#title";

    url: string;
    title: string;
    thumbnail: string;
    duration: GuildQueueTrackDuration;

    requested: User;
}

interface GuildQueueTrackDuration {
    hours: string;
    minutes: string;
    seconds: string;
}

interface GuildQueue {
    startTimestamp: number;
    endTimestamp: number;

    repeat: RepeatMode;
    channel: GuildQueueChannel;
    playback: GuildQueuePlayback;

    dispatcher: AudioPlayer;
    connection: VoiceConnection;

    tracks: GuildQueueTrack[];
}

interface GuildQueueChannel {
    text: PlayerTextChannel;
    voice: PlayerVoiceChannel;
}

interface GuildQueuePlayback {
    state: null;
    filter: null;
    volume: number;
}

interface GuildQueueRepeat {
    track: boolean;
    queue: boolean;
}

type PlayerTextChannel = Exclude<TextBasedChannel, DMChannel | PartialDMChannel>;
type PlayerVoiceChannel = StageChannel | VoiceChannel;

enum ChannelType {
    TEXT = "text",
    VOICE = "voice"
}

enum TimestampType {
    END = "end",
    START = "start"
}

type SetChannelType<TChannelType extends ChannelType> = TChannelType extends ChannelType.TEXT
    ? PlayerTextChannel
    : PlayerVoiceChannel

export {
    GuildQueueManager,

    GuildQueue,
    GuildQueueChannel,
    GuildQueuePlayback,

    GuildQueueTrack,
    GuildQueueTrackDuration,

    SetChannelType,
    PlayerTextChannel,
    PlayerVoiceChannel,

    RepeatMode,
    ChannelType,
    TimestampType
}