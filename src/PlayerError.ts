import errors from './data/errors.json';

/**
 * Codes of the errors thrown by the module
 *
 * @typedef {object} PlayerErrorCode
 *
 * @prop {string} MISSING_PARAMETER A required parameter was not passed
 * @prop {string} INVALID_TYPE A parameter has an invalid data type
 * @prop {string} INVALID_VALUE A parameter has an invalid value
 * @prop {string} QUEUE_NOT_FOUND The server has no queue
 * @prop {string} QUEUE_TRACK_NOT_FOUND There is no track with the given index in the queue
 * @prop {string} SHUFFLE_UNAVAILABLE There are not enough tracks in the queue to shuffle
 * @prop {string} INVALID_STATE The queue can not be switched to the given playback state
 * @prop {string} FILTER_NOT_FOUND The filter is not registered
 * @prop {string} FILTER_EXISTS The filter is already registered
 * @prop {string} PLAYLIST_NOT_FOUND The playlist does not exist
 * @prop {string} GUILD_PLAYLISTS_NOT_FOUND The server has no playlists
 * @prop {string} PLAYLIST_TRACK_NOT_FOUND There is no track with the given index in the playlist
 * @prop {string} PLAYLIST_TRACK_EXISTS The track is already in the playlist
 * @prop {string} USER_NOT_IN_VOICE The user is not in a voice channel
 * @prop {string} ALREADY_CONNECTED The client is already connected to a voice channel
 * @prop {string} CONNECTION_FAILED The client can not connect to the voice channel
 * @prop {string} GUILD_NOT_FOUND The server does not exist on the client
 * @prop {string} TRACK_NOT_FOUND No track was found by the title or link
 * @prop {string} SIGN_IN_REQUIRED YouTube asks to sign in (age-restricted video or a bot check): the cookies of an account are needed
 * @prop {string} LYRICS_NOT_FOUND No lyrics were found
 * @prop {string} COLLECTOR_NO_RESULTS The collector got an empty list of results
 * @prop {string} COLLECTOR_UNKNOWN The collector can not handle that many results
 * @prop {string} COLLECTOR_SMALL_VALUE The user selected a number that is too small
 * @prop {string} COLLECTOR_LARGE_VALUE The user selected a number that is too large
 * @prop {string} COLLECTOR_TIMEOUT The user did not select a track in time
 * @prop {string} COLLECTOR_CANCELLED The user cancelled the selection (or the list message was deleted)
 * @prop {string} SOURCES_FAILED Every source provider failed
 */
export enum PlayerErrorCode {
    MISSING_PARAMETER = 'MISSING_PARAMETER',
    INVALID_TYPE = 'INVALID_TYPE',
    INVALID_VALUE = 'INVALID_VALUE',
    QUEUE_NOT_FOUND = 'QUEUE_NOT_FOUND',
    QUEUE_TRACK_NOT_FOUND = 'QUEUE_TRACK_NOT_FOUND',
    SHUFFLE_UNAVAILABLE = 'SHUFFLE_UNAVAILABLE',
    INVALID_STATE = 'INVALID_STATE',
    FILTER_NOT_FOUND = 'FILTER_NOT_FOUND',
    FILTER_EXISTS = 'FILTER_EXISTS',
    PLAYLIST_NOT_FOUND = 'PLAYLIST_NOT_FOUND',
    GUILD_PLAYLISTS_NOT_FOUND = 'GUILD_PLAYLISTS_NOT_FOUND',
    PLAYLIST_TRACK_NOT_FOUND = 'PLAYLIST_TRACK_NOT_FOUND',
    PLAYLIST_TRACK_EXISTS = 'PLAYLIST_TRACK_EXISTS',
    USER_NOT_IN_VOICE = 'USER_NOT_IN_VOICE',
    ALREADY_CONNECTED = 'ALREADY_CONNECTED',
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    GUILD_NOT_FOUND = 'GUILD_NOT_FOUND',
    TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
    SIGN_IN_REQUIRED = 'SIGN_IN_REQUIRED',
    LYRICS_NOT_FOUND = 'LYRICS_NOT_FOUND',
    COLLECTOR_NO_RESULTS = 'COLLECTOR_NO_RESULTS',
    COLLECTOR_UNKNOWN = 'COLLECTOR_UNKNOWN',
    COLLECTOR_SMALL_VALUE = 'COLLECTOR_SMALL_VALUE',
    COLLECTOR_LARGE_VALUE = 'COLLECTOR_LARGE_VALUE',
    COLLECTOR_TIMEOUT = 'COLLECTOR_TIMEOUT',
    COLLECTOR_CANCELLED = 'COLLECTOR_CANCELLED',
    SOURCES_FAILED = 'SOURCES_FAILED'
}

// Message templates and statuses of the errors
const definitions: Record<PlayerErrorCode, { status: number, message: string }> = {
    [PlayerErrorCode.MISSING_PARAMETER]:         { status: 400, message: errors.default.requireParam },
    [PlayerErrorCode.INVALID_TYPE]:              { status: 400, message: errors.default.invalidType },
    [PlayerErrorCode.INVALID_VALUE]:             { status: 400, message: errors.default.invalidValue },
    [PlayerErrorCode.QUEUE_NOT_FOUND]:           { status: 404, message: errors.default.missingQueue },
    [PlayerErrorCode.QUEUE_TRACK_NOT_FOUND]:     { status: 404, message: errors.other.unknownGuildTrack },
    [PlayerErrorCode.SHUFFLE_UNAVAILABLE]:       { status: 403, message: errors.other.shuffleInfo },
    [PlayerErrorCode.INVALID_STATE]:             { status: 409, message: errors.other.unknownState },
    [PlayerErrorCode.FILTER_NOT_FOUND]:          { status: 404, message: errors.filters.notFound },
    [PlayerErrorCode.FILTER_EXISTS]:             { status: 409, message: errors.filters.exists },
    [PlayerErrorCode.PLAYLIST_NOT_FOUND]:        { status: 404, message: errors.playlists.notFound },
    [PlayerErrorCode.GUILD_PLAYLISTS_NOT_FOUND]: { status: 404, message: errors.playlists.guildNotFound },
    [PlayerErrorCode.PLAYLIST_TRACK_NOT_FOUND]:  { status: 404, message: errors.playlists.trackNotFound },
    [PlayerErrorCode.PLAYLIST_TRACK_EXISTS]:     { status: 409, message: errors.playlists.existsTrack },
    [PlayerErrorCode.USER_NOT_IN_VOICE]:         { status: 404, message: errors.voice.notConnected },
    [PlayerErrorCode.ALREADY_CONNECTED]:         { status: 409, message: errors.voice.alreadyConnected },
    [PlayerErrorCode.CONNECTION_FAILED]:         { status: 503, message: errors.voice.failConnect },
    [PlayerErrorCode.GUILD_NOT_FOUND]:           { status: 404, message: errors.other.unknownGuild },
    [PlayerErrorCode.TRACK_NOT_FOUND]:           { status: 404, message: errors.other.unknownTrack },
    [PlayerErrorCode.SIGN_IN_REQUIRED]:          { status: 401, message: errors.other.signInRequired },
    [PlayerErrorCode.LYRICS_NOT_FOUND]:          { status: 404, message: errors.other.notLyrics },
    [PlayerErrorCode.COLLECTOR_NO_RESULTS]:      { status: 400, message: errors.collectors.unknownResults },
    [PlayerErrorCode.COLLECTOR_UNKNOWN]:         { status: 400, message: errors.collectors.unknownCollector },
    [PlayerErrorCode.COLLECTOR_SMALL_VALUE]:     { status: 400, message: errors.collectors.smallValue },
    [PlayerErrorCode.COLLECTOR_LARGE_VALUE]:     { status: 400, message: errors.collectors.largeValue },
    [PlayerErrorCode.COLLECTOR_TIMEOUT]:         { status: 408, message: errors.collectors.timeout },
    [PlayerErrorCode.COLLECTOR_CANCELLED]:       { status: 499, message: errors.collectors.cancelled },
    [PlayerErrorCode.SOURCES_FAILED]:            { status: 502, message: errors.other.sourcesFailed }
};

/**
 * Error thrown by the module. Check `code` to find out what went wrong.
 *
 * @class
 * @classdesc Player Error Class
 * @extends {Error}
 *
 * @example
 * try {
 *     await client.player.queue.skipTrack('GuildID');
 * }catch(error) {
 *     if(error instanceof PlayerError && error.code === PlayerErrorCode.QUEUE_NOT_FOUND) return message.channel.send({ content: 'Nothing is playing!' });
 *
 *     throw error;
 * }
 */
export class PlayerError extends Error {
    /**
     * Error name
     *
     * @type {string}
     */
    public name: string = 'PlayerError';

    /**
     * Error code
     *
     * @type {PlayerErrorCode}
     */
    public readonly code: PlayerErrorCode;

    /**
     * HTTP-like status of the error (404 not found, 400 invalid parameters, 409 conflict, 502 or 503 external service failure)
     *
     * @type {number}
     */
    public readonly status: number;

    /**
     * @constructor
     *
     * @param {PlayerErrorCode} code Error code
     * @param {Record<string, string | number>} [params] Values for the placeholders of the message
     * @param {unknown} [cause] Original error
     */
    constructor(code: PlayerErrorCode, params: Record<string, string | number> = {}, cause?: unknown) {
        const definition = definitions[code];

        super(Object.entries(params).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, String(value)), definition.message), cause === undefined ? undefined : { cause });

        this.code = code;
        this.status = definition.status;
    }
}

/**
 * Throws an error if a required parameter is missing
 *
 * @param {unknown} value Parameter value
 * @param {string} param Parameter name
 * @param {string} where Class and method name, for example `<QueueManager>.skipTrack`
 *
 * @throws {PlayerError} If the value is `undefined`, `null` or an empty string
 *
 * @private
 */
export function requireParam(value: unknown, param: string, where: string): void {
    if(value === undefined || value === null || value === '') throw new PlayerError(PlayerErrorCode.MISSING_PARAMETER, { param, data: where });
}
