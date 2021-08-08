import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { TextChannel, User, VoiceChannel } from 'discord.js';

export interface PlayerSong {
    index?: number;
    searchType: string;
    title: string;
    url: string;
    thumbnail: string;
    author: string;
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    requestedBy: User;

    duration: {
        hours: string;
        minutes: string;
        seconds: string;
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
    dispatcher?: AudioPlayer;
    songs: Array<PlayerSong>;
    volume: number;

    loop: {
        song: boolean;
        queue: boolean;
    }
    
    startStream: number;
    playing: boolean;
    filter: string | null;
}

export interface PlayerFilter {
    name: string;
    value: string;
}