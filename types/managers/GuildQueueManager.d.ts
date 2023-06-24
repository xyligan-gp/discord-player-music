// Import manager requirements
import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { DMChannel, PartialDMChannel, TextBasedChannel, VoiceBasedChannel as PlayerVoiceChannel, User } from "discord.js";

declare class GuildQueueManager {
    public startTimestamp: number;
    public endTimestamp: number;

    public repeat: GuildQueueRepeat;
    public channel: GuildQueueChannel;
    public playback: GuildQueuePlayback;

    public dispatcher: AudioPlayer;
    public connection: VoiceConnection;

    public tracks: GuildQueueTrack[];
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

    repeat: GuildQueueRepeat;
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

export {
    GuildQueueManager,

    GuildQueue,
    GuildQueueChannel,
    GuildQueuePlayback,
    GuildQueueRepeat,

    GuildQueueTrack,
    GuildQueueTrackDuration
}