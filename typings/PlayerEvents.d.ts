import { Client } from 'discord.js';

import { PlayerError, PlayerQueue, PlayerSong } from './PlayerData';

interface PlayerEvents {
    ready: Client;
    playerError: PlayerError;
    playingSong: PlayerQueue;
    songsAdded: PlayerSong;
    queueEnded: PlayerQueue;
}

export = PlayerEvents;