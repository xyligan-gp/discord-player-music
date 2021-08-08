import { Collection, TextChannel, VoiceChannel } from 'discord.js';
import { AudioPlayer, VoiceConnection } from '@discordjs/voice';

import { PlayerSong } from './PlayerData';

declare class QueueManager extends Collection {
    constructor();

    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    dispatcher?: AudioPlayer;
    songs: Array<PlayerSong>;
    volume: number;
    
    loop: {
        song: boolean;
        queue: boolean;
    }

    startStream: number;
    playing: boolean;
    filter: string;
}

export = QueueManager;