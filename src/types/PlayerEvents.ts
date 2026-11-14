import type { Player } from '../Player';
import { GuildQueueState } from '../PlayerEnums';

import { GuildPlaylist, PlayerErrorEvent, PlayerQueue, PlayerTrack, ProviderFailedEvent, SourceUsedEvent, TrackSkippedEvent, YtDlpStatusEvent } from './PlayerData';

/**
 * Events of the player and their arguments
 */
export interface PlayerEvents {
    ready: [player: Player];
    error: [data: PlayerErrorEvent];

    addedTrack: [track: PlayerTrack];
    playingTrack: [track: PlayerTrack];

    createdPlaylist: [playlist: GuildPlaylist];
    deletedPlaylist: [playlist: GuildPlaylist];

    queueStarted: [queue: PlayerQueue];
    queueEnded: [queue: PlayerQueue];

    queueStateChange: [queue: PlayerQueue, oldState: GuildQueueState, newState: GuildQueueState];
    providerFailed: [data: ProviderFailedEvent];
    sourceUsed: [data: SourceUsedEvent];
    ytdlpStatus: [data: YtDlpStatusEvent];
    skippedTrack: [data: TrackSkippedEvent];
}
