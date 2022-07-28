import { Player } from '../Player';
import { PlaylistTrack } from '../PlayerData';

export declare class DatabaseManager {
    /**
     * Player Class
     */
    private player: Player;

    /**
     * Player Playlists Storage
     */
    private storage: object;

    /**
     * Player Database Configuration
     */
    public config: {
        path: string;
        checkInterval: string;
    }

    /**
     * Method to get database object
     */
    public get(): object;

    /**
     * Method for writing data to the database
     * 
     * @param data Database object
     */
    public write(data?: object): void;
    
    /**
     * Allows you to initialize data for a single server
     * 
     * @param guildID Discord Guild ID
     */
    public initGuild(guildID: string): void;

    /**
     * Method for module database initialization
     */
    private init(): void;
}