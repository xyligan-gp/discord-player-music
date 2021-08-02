import { VoiceConnection } from '@discordjs/voice';
import { TextChannel, User, VoiceChannel } from 'discord.js';

export interface PlayerSong {
    index: number | null;
    searchType: string;
    title: string;
    url: string;
    thumbnail: string;
    author: string;
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    requestedBy: User;

    duration: {
        hours: number | string;
        minutes: number | string;
        seconds: number | string;
    }
}

export interface PlayerError {
    textChannel?: TextChannel;
    requested: User;
    method: string;
    error: Error;
}

export interface PlayerQueue {
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    songs: Array<Song>;
    volume: number;
    loop: boolean;
    queueLoop: boolean;
    playing: boolean;
    filter: string | null;
}