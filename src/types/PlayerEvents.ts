import type { Player } from '../Player';
import { GuildQueueState } from '../PlayerEnums';

import { PlayerErrorEvent, PlayerQueue, PlayerTrack, QueueEndReason, ProviderFailedEvent, SourceUsedEvent, TrackSkippedEvent, YtDlpStatusEvent } from './PlayerData';

/**
 * Events of the player and their arguments
 */
export interface PlayerEvents {
    ready: [player: Player];
    error: [data: PlayerErrorEvent];

    addedTrack: [track: PlayerTrack];
    playingTrack: [track: PlayerTrack];


    queueStarted: [queue: PlayerQueue];
    queueEnded: [queue: PlayerQueue, reason: QueueEndReason];

    queueStateChange: [queue: PlayerQueue, oldState: GuildQueueState, newState: GuildQueueState];
    autoplayAdded: [queue: PlayerQueue, tracks: Array<PlayerTrack>];
    providerFailed: [data: ProviderFailedEvent];
    sourceUsed: [data: SourceUsedEvent];
    ytdlpStatus: [data: YtDlpStatusEvent];
    skippedTrack: [data: TrackSkippedEvent];
}
