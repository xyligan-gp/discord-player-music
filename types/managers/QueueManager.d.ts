// Import manager requirements
import { AudioPlayer, AudioResource, VoiceConnection } from "@discordjs/voice";
import { DMChannel, PartialDMChannel, StageChannel, TextBasedChannel, VoiceChannel, User } from "discord.js";

// Import utils
import { RestOrArray } from "../util/normalizeArray.function";

declare class QueueManager {
    public startTimestamp: number;
    public endTimestamp: number;

    public repeat: GuildQueueRepeat;
    public channel: GuildQueueChannel;
    public playback: GuildQueuePlayback;

    public dispatcher: AudioPlayer;
    public connection: VoiceConnection;

    public tracks: GuildQueueTrack[];

    private _resource: AudioResource;

    /**
     * Checks if the queue is empty.
     */
    public get isEmpty(): boolean;

    /**
     * Checks if the player is startable.
     */
    public get isStartable(): boolean;

    /**
     * Retrieves the currently playing track from the queue.
     */
    public get nowPlaying(): GuildQueueTrack;

    /**
     * Sets the timestamp value for the specified type in the QueueManager.
     * 
     * @param type - The type of timestamp.
     * @param value - The timestamp value to set. If not provided, the current timestamp will be used.
     * 
     * @returns The QueueManager instance.
     */
    public setTimestamp(type: TimestampType, value?: number): QueueManager;

    /**
     * Sets the repeat mode for the QueueManager.
     * 
     * @param type - The repeat mode to set.
     * 
     * @returns The QueueManager instance.
     */
    public setRepeatMode(type?: RepeatMode): QueueManager;

    /**
     * Sets the channel for the specified channel type in the QueueManager.
     *
     * @template TChannelType - The channel type (ChannelType.TEXT or ChannelType.VOICE).
     * 
     * @param type - The channel type.
     * @param channel - The channel to set.
     * 
     * @returns The QueueManager instance.
     */
    public setChannel<TChannelType extends ChannelType>(
        type: TChannelType,
        channel: SetChannelType<TChannelType>
    ): QueueManager;

    /**
     * Set the volume of the playback.
     *
     * @param value - The volume level to set (0 to 100).
     * 
     * @returns The updated QueueManager instance.
     */
    public setVolume(value: number): QueueManager;

    /**
     * Adds tracks to the guild queue.
     *
     * @param tracks - The tracks to add. Accepts both array and variadic arguments.
     * 
     * @returns The QueueManager instance.
     */
    public addTracks(...tracks: RestOrArray<GuildQueueTrack>): QueueManager;

    /**
     * Creates a QueueManager instance from the provided GuildQueue data.
     * 
     * @param data - The GuildQueue data.
     * 
     * @returns The created QueueManager instance.
     */
    public static from(data: GuildQueue): QueueManager;

    /**
     * Converts the QueueManager instance to a plain object representation.
     *
     * @returns The GuildQueue object representation of the QueueManager.
     */
    public toJSON(): GuildQueue;
}

declare enum RepeatMode {
    DISABLED,
    TRACK,
    QUEUE
}

interface PlayerPlaylist {
    id: string;
    url: string;
    title: string;
    views: number;
    thumbnail: string;

    author: GuildQueueTrackAuthor;
    duration: GuildQueueTrackDuration;

    tracks: GuildQueueTrack[];
}

interface GuildQueueTrack {
    searchType: "search#url" | "search#title" | "search#playlist";

    url: string;
    title: string;
    thumbnail: string;

    author: GuildQueueTrackAuthor;
    duration: GuildQueueTrackDuration;

    requested: User;
}

interface GuildQueueTrackAuthor {
    url: string;
    name: string;
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

declare enum ChannelType {
    TEXT = "text",
    VOICE = "voice"
}

declare enum TimestampType {
    END = "end",
    START = "start"
}

type SetChannelType<TChannelType extends ChannelType> = TChannelType extends ChannelType.TEXT
    ? PlayerTextChannel
    : PlayerVoiceChannel

export {
    QueueManager,

    PlayerPlaylist,
    
    GuildQueue,
    GuildQueueChannel,
    GuildQueuePlayback,

    GuildQueueTrack,
    GuildQueueTrackAuthor,
    GuildQueueTrackDuration,

    SetChannelType,
    PlayerTextChannel,
    PlayerVoiceChannel,

    RepeatMode,
    ChannelType,
    TimestampType
}