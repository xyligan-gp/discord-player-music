/**
 * @typedef {object} Collector
 * 
 * @prop {string} MESSAGE Message collector
 * @prop {string} REACTION Reactions collector
 */
export enum Collector {
    MESSAGE = 'message',
    REACTION = 'reaction'
}

/**
 * @typedef {object} Events
 * 
 * @prop {string} READY Player ready event
 * @prop {string} ERROR Player error event
 * @prop {string} TRACK_ADD Player 'addedTrack' event
 * @prop {string} TRACK_PLAYING Player 'playingTrack' event
 * @prop {string} QUEUE_STARTED Player 'queueStarted' event
 * @prop {string} QUEUE_ENDED Player 'queueEnded' event (a queue was closed for any reason, the second argument tells why)
 * @prop {string} QUEUE_STATE Player 'queueStateChange' event
 * @prop {string} AUTOPLAY_ADDED Player 'autoplayAdded' event (the autoplay added related tracks to the queue)
 * @prop {string} PROVIDER_FAILED Player 'providerFailed' event (a source provider failed, the next one is tried)
 * @prop {string} YTDLP_STATUS Player 'ytdlpStatus' event (a step of finding, checking, downloading or updating yt-dlp)
 * @prop {string} SOURCE_USED Player 'sourceUsed' event (which source provider gives the audio of a track)
 * @prop {string} TRACK_SKIPPED Player 'skippedTrack' event (a track could not be played and the queue goes on with the next one)
 */
export enum Events {
    READY = 'ready',
    ERROR = 'error',
    TRACK_ADD = 'addedTrack',
    TRACK_PLAYING = 'playingTrack',
    QUEUE_STARTED = 'queueStarted',
    QUEUE_ENDED = 'queueEnded',
    QUEUE_STATE = 'queueStateChange',
    AUTOPLAY_ADDED = 'autoplayAdded',
    PROVIDER_FAILED = 'providerFailed',
    YTDLP_STATUS = 'ytdlpStatus',
    SOURCE_USED = 'sourceUsed',
    TRACK_SKIPPED = 'skippedTrack'
}

/**
 * @typedef {object} GuildQueueState
 * 
 * @prop {string} PAUSED Playback is paused (waiting to be restored)
 * @prop {string} PLAYING Playback is active and not stopped
 */
export enum GuildQueueState {
    PAUSED = 'STATE_PAUSED',
    PLAYING = 'STATE_PLAYING'
}

/**
 * @typedef {object} Loop
 * 
 * @prop {string} QUEUE Loop all tracks in queue
 * @prop {string} TRACK Loop only current track
 */
export enum Loop {
    QUEUE = 'LOOP_QUEUE',
    TRACK = 'LOOP_TRACK'
}

/**
 * @typedef {object} Search
 * 
 * @prop {string} URL Search url value
 * @prop {string} TITLE Search title value
 * @prop {string} PLAYLIST Search playlist link value (all tracks of the playlist are returned)
 * @prop {string} AUTOPLAY The track was added by the autoplay (it is related to the track that played before)
 */
export enum Search {
    URL = 'search#url',
    TITLE = 'search#title',
    PLAYLIST = 'search#playlist',
    AUTOPLAY = 'search#autoplay'
}