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
 * @prop {function(): Promise<void>} [prepare] Prepares the provider ahead of time, for example connects to a service or downloads a program. The player calls it when it is created (optional).
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
}
