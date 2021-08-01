import { Client, Collection, GuildMember, TextChannel } from 'discord.js';

import Emitter from '../src/Emitter.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';
import { PlayerSong } from './PlayerData';
import PlayerEvents from './PlayerEvents';

import QueueManager from './QueueManager';
import UtilsManager from './UtilsManager';
import VoiceManager from './VoiceManager';

declare class DiscordPlayerMusic extends Emitter {
    constructor(client: Client, options?: DiscordPlayerMusicOptions);

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
    public play(guild: Guild, song: PlayerSong): Promise<void>;

    /**
     * Method to search for songs by user query
     * @param member Guild Member
     * @param query Song Name or URL
     * @param channel Guild Text Channel
     * @returns Returns a list of found songs
    */
    public searchSong(member: GuildMember, query: string, channel: TextChannel): Promise<Array<PlayerSong>>;

    /**
     * Method for adding a song to the server queue
     * @param index Song Index
     * @param member Guild Member
     * @param resultsArray Results List
    */
    public addSong(index: number, member: GuildMember, resultsArray: Array<PlayerSong>): Promise<void>;

    /**
     * Method for initializing the module
    */
    private init(): void;

    on<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K][]) => void): this;
    once<K extends keyof PlayerEvents>(event: K, listener: (...args: PlayerEvents[K][]) => void): this;
    emit<K extends keyof PlayerEvents>(event: K, ...args: PlayerEvents[K][]): boolean;
}

export = DiscordPlayerMusic;