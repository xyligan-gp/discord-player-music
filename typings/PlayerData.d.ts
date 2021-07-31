import { TextChannel, User, VoiceChannel } from 'discord.js';

export interface Song {
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