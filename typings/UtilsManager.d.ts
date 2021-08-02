import { Client, GuildMember, Message, Permissions } from 'discord.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';

declare class UtilsManager {
    constructor(client: Client);

    public client: Client;
    public mode: string;
    public methods: Array<string>;
    public size: number;

    /**
     * Method for validating Player options
     * @param options Player Options
     * @returns Returns valid Player options
    */
    public checkOptions(options: DiscordPlayerMusicOptions): DiscordPlayerMusicOptions;

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
     * Method for formatting numbers
     * @param numbersArray Numbers Array
     * @returns Returns an array with formatted numbers
    */
    public formatNumbers(numbersArray: Array<Number>): Array<string>;
}

export = UtilsManager;