/**
 * @typedef {object} Collector
 *
 * @prop {string} MESSAGE Message collector
 * @prop {string} REACTION Reactions collector
 */
export enum Collector {
  MESSAGE = "message",
  REACTION = "reaction",
}

/**
 * @typedef {object} Events
 *
 * @prop {string} READY Player ready event
 * @prop {string} ERROR Player error event
 * @prop {string} TRACK_ADD Player 'addedTrack' event
 * @prop {string} TRACK_PLAYING Player 'playingTrack' event
 * @prop {string} PLAYLIST_CREATED Player 'createdPlaylist' event
 * @prop {string} PLAYLIST_DELETED Player 'deletedPlaylist' event
 * @prop {string} QUEUE_STARTED Player 'queueStarted' event
 * @prop {string} QUEUE_ENDED Player 'queueEnded' event
 * @prop {string} QUEUE_STATE Player 'queueStateChange' event
 */
export enum Events {
  READY = "ready",
  ERROR = "error",
  TRACK_ADD = "addedTrack",
  TRACK_PLAYING = "playingTrack",
  PLAYLIST_CREATED = "createdPlaylist",
  PLAYLIST_DELETED = "deletedPlaylist",
  QUEUE_STARTED = "queueStarted",
  QUEUE_ENDED = "queueEnded",
  QUEUE_STATE = "queueStateChange",
}

/**
 * @typedef {object} GuildQueueState
 *
 * @prop {string} PAUSED Playback is paused (waiting to be restored)
 * @prop {string} PLAYING Playback is active and not stopped
 */
export enum GuildQueueState {
  PAUSED = "STATE_PAUSED",
  PLAYING = "STATE_PLAYING",
}

/**
 * @typedef {object} Loop
 *
 * @prop {string} QUEUE Loop all tracks in queue
 * @prop {string} TRACK Loop only current track
 */
export enum Loop {
  QUEUE = "LOOP_QUEUE",
  TRACK = "LOOP_TRACK",
}

/**
 * @typedef {object} Search
 *
 * @prop {string} URL Search url value
 * @prop {string} TITLE Search title value
 */
export enum Search {
  URL = "search#url",
  TITLE = "search#title",
}
