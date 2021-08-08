import { GuildMember, Permissions } from 'discord.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';

declare class UtilsManager {
    constructor();

    public methods: Array<string>;
    public size: number;

    /**
     * Method for checking the Node.js version installed on the server
    */
    public checkNode(): Promise<void>;

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
     * Method for formatting numbers
     * @param numbersArray Numbers Array
     * @returns Returns an array with formatted numbers
    */
    public formatNumbers(numbersArray: Array<Number>): Array<string>;

    /**
     * Method for determining the mode of operation of the module
     * @returns Player Mode
    */
    public getPlayerMode(): string;
}

export = UtilsManager;