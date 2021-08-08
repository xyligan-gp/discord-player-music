import { PlayerError, PlayerQueue, PlayerSong } from './PlayerData';

interface PlayerEvents {
    playerError: PlayerError;
    playingSong: PlayerQueue;
    songsAdded: PlayerSong;
    queueEnded: PlayerQueue;
}

export = PlayerEvents;