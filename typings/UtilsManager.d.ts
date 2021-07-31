import { Client, Collection, Guild, GuildMember, Message, Permissions } from 'discord.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';
import { StreamOptions } from './PlayerData';

import QueueManager from './QueueManager';

declare class UtilsManager {
    constructor(client: Client, options: DiscordPlayerMusicOptions, queue: Collection<string, QueueManager>, mode: string);

    public client: Client;
    public options: DiscordPlayerMusicOptions;
    public queue: Collection<string, QueueManager>;
    public mode: string;

    /**
     * Method for checking user permissions
     * @param member Guild Member
     * @param permissions Permissions Array
     * @returns Returns the status of the user permissions
    */
    public checkPermissions(member: GuildMember, permissions: Array<Permissions>): Promise<boolean>;

    /**
     * Method for creating custom collectors
     * @param message Discord Message
     * @param type Collector Type
    */
    public createCollector(message: Message, type: 'message' | 'reaction'): Promise<null>;

    /**
     * Method for creating a server stream
     * @param guild Discord Guild
    */
    public createStream(guild: Guild): Promise<void>;

    /**
     * Method for generating options for stream
     * @param guild Discord Guild
     * @returns Returns options for creating a stream
    */
    public generateStreamOptions(guild: Guild): Promise<StreamOptions>;

    /**
     * Method for formatting numbers
     * @param numbersArray Numbers Array
     * @returns Returns an array with formatted numbers
    */
    public formatNumbers(numbersArray: Array<Number>): Array<string>;
}

export = UtilsManager;