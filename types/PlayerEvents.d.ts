import { Player, GuildQueueState } from "./Player";

import {
  GuildPlaylist,
  PlayerError,
  PlayerQueue,
  PlayerTrack,
} from "./PlayerData";

export interface PlayerEvents {
  ready: [player: Player];
  error: [error: PlayerError];

  addedTrack: [track: PlayerTrack];
  playingTrack: [track: PlayerTrack];

  createdPlaylist: [playlist: GuildPlaylist];
  deletedPlaylist: [playlist: GuildPlaylist];

  queueStarted: [queue: PlayerQueue];
  queueEnded: [queue: PlayerQueue];

  queueStateChange: [
    queue: PlayerQueue,
    oldState: GuildQueueState,
    newState: GuildQueueState
  ];
}
