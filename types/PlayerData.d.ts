import { Guild, TextChannel, VoiceChannel, User } from 'discord.js';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';

import { GuildQueueState } from './Player';

interface PlayerFilters {
    '3D': string;
    bassboost: string;
    echo: string;
    fadein: string;
    flanger: string;
    gate: string;
    haas: string;
    karaoke: string;
    nightcore: string;
    reverse: string;
    vaporwave: string;
    mcompand: string;
    phaser: string;
    tremolo: string;
    surround: string;
    slowed: string;
    earwax: string;
    underwater: string;
    clear: null;
}

export type Filter = keyof PlayerFilters;

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
}

export interface PlayerFilter {
    name: string | null;
    value: string | null;
}

export interface PlayerError {
    channel?: {
        text?: TextChannel;
        voice?: VoiceChannel;
    }

    requested: User;
    method: string;
    error: Error;
}

export interface LyricsData {
    query: string;
    result: string;
}

export interface PlaylistTrack {
    url: string;
    title: string;
}

export interface CreatePlaylistData {
    title?: string;
    author: string;
    track: PlaylistTrack;
}

export interface AddPlaylistData {
    id?: string;
    track: PlaylistTrack;
}

export interface GuildPlaylist {
    id: string;
    title: string;
    author: string;
    created: number;
    updated: number;
    duration: number;
    lastPlaying: number;
    tracks: Array<PlaylistTrack>;
}

export interface ErrorData {
    error: {
        code: number;
        message: string;
    }
}

export interface SkipData {
    current: PlayerTrack;
    next: PlayerTrack;
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

export interface StreamData {
    loop: {
        track: boolean;
        queue: boolean;
    },

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

export interface PlayerError {
    channel?: {
        text?: TextChannel;
        voice?: VoiceChannel;
    }

    requested: User;
    method: string;
    error: Error;
}

export interface StreamOptions {
    seek?: number;
    filter?: string;
}

export interface DatabaseManagerConfiguration {
    path: string;
    checkInterval: string;
}