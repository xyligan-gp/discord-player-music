import { Client, Collection, GuildMember, TextChannel } from 'discord.js';

import Emitter from '../src/Emitter.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';
import { Song } from './PlayerData';

import QueueManager from './QueueManager';
import UtilsManager from './UtilsManager';
import VoiceManager from './VoiceManager';

declare class DiscordPlayerMusic extends Emitter {
    constructor(client: Client, options: DiscordPlayerMusicOptions);

    public client: Client;
    public ready: boolean;
    public options: DiscordPlayerMusicOptions;
    public docs: string;
    public version: string;
    public author: string;
    public mode: string;
    public managers: Array<string>;
    public size: number;

    public queue: Collection<string, QueueManager>;
    public utils: UtilsManager;
    public voice: VoiceManager;

    /**
     * Method for playing songs on the server
     * @param guild Discord Guild
     * @param song Song Info
    */
    public play(guild: Guild, song: Song): Promise<void>;

    /**
     * Method to search for songs by user query
     * @param member Guild Member
     * @param query Song Name or URL
     * @param channel Guild Text Channel
     * @returns Returns a list of found songs
    */
    public searchSong(member: GuildMember, query: string, channel: TextChannel): Promise<Array<Song>>;

    /**
     * Method for adding a song to the server queue
     * @param index Song Index
     * @param member Guild Member
     * @param resultsArray Results List
    */
    public addSong(index: number, member: GuildMember, resultsArray: Array<Song>): Promise<void>;

    /**
     * Method for initializing the module
    */
    private init(): void;
}

export = DiscordPlayerMusic;