import { Readable } from 'node:stream';

/**
 * Basic information about a track received from a source provider
 *
 * @typedef {object} SourceTrack
 *
 * @prop {string} id Track ID inside the provider
 * @prop {string} title Track title
 * @prop {string} url Track URL
 * @prop {string} thumbnail Track thumbnail URL
 * @prop {number} seconds Track duration in seconds (0 for live streams)
 * @prop {object} author Track author
 * @prop {string} author.name Author name
 * @prop {string} author.url Author URL
 * @prop {string} source Name of the provider that returned the track
 */
export interface SourceTrack {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    seconds: number;

    author: {
        name: string;
        url: string;
    }

    source: string;
}

/**
 * Playlist received from a source provider
 *
 * @typedef {object} SourcePlaylist
 *
 * @prop {string} id Playlist ID inside the provider
 * @prop {string} title Playlist title
 * @prop {string} url Playlist URL
 * @prop {Array<SourceTrack>} tracks Tracks of the playlist (only the first ones if the playlist is longer than the limit)
 * @prop {string} source Name of the provider that returned the playlist
 */
export interface SourcePlaylist {
    id: string;
    title: string;
    url: string;
    tracks: Array<SourceTrack>;
    source: string;
}

/**
 * Options for creating an audio stream
 *
 * @typedef {object} SourceStreamOptions
 *
 * @prop {number} [seek] Position to start from, in seconds
 * @prop {string} [filter] FFmpeg audio filter value (`-af`)
 */
export interface SourceStreamOptions {
    seek?: number;
    filter?: string;
}

/**
 * Options of a search for related tracks
 *
 * @typedef {object} SourceRelatedOptions
 *
 * @prop {number} limit How many tracks are wanted at most
 * @prop {Array<string>} [exclude] URLs that must not be returned (the tracks that were already played)
 */
export interface SourceRelatedOptions {
    limit: number;
    exclude?: Array<string>;
}

/**
 * Interface that every track source must implement.
 * Providers can be passed to the `sources` player option or added with `SourceRegistry#register`.
 *
 * @typedef {object} SourceProvider
 *
 * @prop {string} name Unique provider name
 * @prop {function(string): boolean} canHandle Returns `true` if the provider can resolve the given URL
 * @prop {function(string, number): Promise<Array<SourceTrack>>} search Searches tracks by text query
 * @prop {function(string): Promise<SourceTrack>} resolve Gets track information by URL
 * @prop {function(string, SourceStreamOptions): Promise<Readable>} stream Creates an Ogg Opus stream for a track URL
 * @prop {function(string): boolean} [isPlaylist] Returns `true` if the URL is a playlist link that the provider can load (optional)
 * @prop {function(string, number): Promise<SourcePlaylist>} [resolvePlaylist] Gets the tracks of a playlist, no more than the given limit (optional)
 * @prop {function(SourceTrack, SourceRelatedOptions): Promise<Array<SourceTrack>>} [related] Finds tracks related to the given one, for the autoplay: at most `options.limit` tracks, without the URLs of `options.exclude`. The URL of the track is `track.url` (optional).
 * @prop {function(): Promise<void>} [prepare] Prepares the provider ahead of time, for example connects to a service or downloads a program. The player calls it when it is created (optional).
 * @prop {function(function(): Array<SourceProvider>): void} [attach] Receives a function that returns the other providers of the registry, so a provider can use them (for example to find the audio of a track that it only knows by its information). The registry calls it when the provider is added (optional).
 * @prop {function(string): (string | undefined)} [audioProvider] Name of the provider that actually gives the audio of the track with the given URL, for providers that play the audio of other sources (optional). It is shown in the `via` field of the `sourceUsed` event.
 */
export interface SourceProvider {
    readonly name: string;

    canHandle(url: string): boolean;
    search(query: string, limit: number): Promise<Array<SourceTrack>>;
    resolve(url: string): Promise<SourceTrack>;
    stream(url: string, options?: SourceStreamOptions): Promise<Readable>;
    isPlaylist?(url: string): boolean;
    resolvePlaylist?(url: string, limit: number): Promise<SourcePlaylist>;
    prepare?(): Promise<void>;
    related?(track: SourceTrack, options: SourceRelatedOptions): Promise<Array<SourceTrack>>;
    attach?(others: () => Array<SourceProvider>): void;
    audioProvider?(url: string): string | undefined;
}
