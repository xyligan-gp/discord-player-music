import { Readable } from 'node:stream';
import { Guild, TextChannel, User, VoiceChannel } from 'discord.js';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';

import { GuildQueueState } from '../PlayerEnums';
import { SourceProvider } from '../sources/SourceProvider';

/**
 * Names of the built-in audio filters
 */
export type Filter = '3D' | 'bassboost' | 'echo' | 'fadein' | 'flanger' | 'gate' | 'haas' | 'karaoke' | 'nightcore' | 'reverse' | 'vaporwave' | 'mcompand' | 'phaser' | 'tremolo' | 'surround' | 'slowed' | 'earwax' | 'underwater' | 'clear';

export interface PlayerFilter {
    name: string | null;
    value: string | null;
}

export interface PlayerTrack {
    index?: number;
    searchType: string;
    title: string;
    url: string;
    thumbnail: string;

    author: {
        name: string;
        url: string;
    }

    channel: {
        text: TextChannel;
        voice: VoiceChannel;
    }

    guild: Guild;
    requested: User;

    duration: {
        hours: string;
        minutes: string;
        seconds: string;
    }

    /**
     * Name of the source provider that returned the track
     */
    source?: string;
}

export interface PlayerQueue {
    channel: {
        text: TextChannel;
        voice: VoiceChannel;
    }

    dispatcher: AudioPlayer;
    tracks: Array<PlayerTrack>;
    connection: VoiceConnection;

    loop: {
        track: boolean;
        queue: boolean;
    }

    volume: number;
    startStream: number;
    state: GuildQueueState;
    filter: PlayerFilter;

    /**
     * The autoplay of this queue: when the tracks are over (and no loop is on), related tracks are found, added and played (`queue.setAutoplay()` switches it)
     */
    autoplay: boolean;

    /**
     * Internal: the track that played last (the autoplay looks for the tracks related to it)
     */
    lastPlayed?: PlayerTrack;

    /**
     * Internal: URLs of the tracks that played or failed lately (the autoplay does not add them again)
     */
    history?: Array<string>;

    /**
     * Internal: the autoplay is looking for tracks now
     */
    autoplaying?: boolean;

    /**
     * Internal: how many times the autoplay worked since a track played successfully (a limit stops an endless chain of tracks that can not be played)
     */
    autoplayRounds?: number;

    /**
     * Internal flag: the current track was removed from the queue and the next one must be played without removing anything else
     */
    currentRemoved?: boolean;

    /**
     * Internal: the stream of the next track that is prepared in advance
     */
    prefetch?: { track: PlayerTrack, filter: string | null, stream: Promise<{ stream: Readable, provider: SourceProvider }> };

    /**
     * Internal: timer that starts preparing the next track
     */
    prefetchTimer?: NodeJS.Timeout;
}

export interface LyricsData {
    query: string;
    result: string;
    title?: string;
    artist?: string;
    source?: string;
}









/**
 * Why a queue was closed (the second argument of the `queueEnded` event): `ended` (the tracks are over), `stopped` (`queue.stop()`),
 * `deleted` (`queue.delete()`), `skipped` (the last track was skipped) or `error` (a fatal error: the voice connection of the queue failed)
 */
export type QueueEndReason = 'ended' | 'stopped' | 'deleted' | 'skipped' | 'error';

export interface SkipData {
    current: PlayerTrack;
    next: PlayerTrack | null;
}

export interface DefaultData {
    status: boolean;
}

export interface CollectorData {
    index: number;
    track: PlayerTrack;
    data: Array<PlayerTrack>;
}

export interface ProgressData {
    bar: string;
    percents: string;
}

export interface AutoplayData {
    autoplay: boolean;
}

export interface StreamData {
    loop: {
        track: boolean;
        queue: boolean;
    }

    autoplay: boolean;

    filter: PlayerFilter;
    state: GuildQueueState;
    volume: number;

    streamTime: {
        days: string | number;
        hours: string | number;
        minutes: string | number;
        seconds: string | number;
    }
}

export interface LoopData {
    track: boolean;
    queue: boolean;
}

export interface RemoveTrackData {
    deleted: PlayerTrack;
    tracks: Array<PlayerTrack>;
}

/**
 * Data of the `error` event
 */
export interface PlayerErrorEvent {
    channel?: {
        text?: TextChannel;
        voice?: VoiceChannel;
    }

    requested?: User;
    method: string;
    error: Error;
}

/**
 * Step of finding, checking, downloading and updating yt-dlp
 */
export type YtDlpStatusStage = 'found' | 'checking' | 'up-to-date' | 'update-available' | 'downloading' | 'installed' | 'skipped' | 'error';

/**
 * Why the check for a newer yt-dlp was skipped
 */
export type YtDlpSkipReason = 'update-disabled' | 'interval' | 'offline' | 'custom-command';

/**
 * Data of the `ytdlpStatus` event
 */
export interface YtDlpStatusEvent {
    stage: YtDlpStatusStage;
    message: string;
    origin: 'command' | 'path' | 'managed';
    path?: string;
    version?: string;
    latest?: string;
    reason?: YtDlpSkipReason;
}

/**
 * Data of the `sourceUsed` event
 */
export interface SourceUsedEvent {
    provider: string;
    via?: string;
    track: PlayerTrack;
    seek?: number;
    prefetched: boolean;
}

/**
 * Data of the `skippedTrack` event
 */
export interface TrackSkippedEvent {
    track: PlayerTrack;
    next: PlayerTrack | null;
    error: Error;
}

/**
 * Data of the `providerFailed` event
 */
export interface ProviderFailedEvent {
    provider: string;
    method: 'search' | 'resolve' | 'stream' | 'resolvePlaylist' | 'related';
    error: Error;
}

export interface StreamOptions {
    seek?: number;
    filter?: string;
}
