import { Collection, TextChannel, VoiceChannel } from 'discord.js';
import { VoiceConnection } from '@discordjs/voice';

import { Song } from './PlayerData';

declare class QueueManager extends Collection {
    constructor();

    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    songs: Array<Song>;
    volume: number;
    loop: boolean;
    queueLoop: boolean;
    playing: boolean;
    filter: string;
}

export = QueueManager;