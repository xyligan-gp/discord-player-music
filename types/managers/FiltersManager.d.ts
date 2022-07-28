import { Player } from '../Player';
import { DefaultData, ErrorData, PlayerFilter } from '../PlayerData';

import { Collection } from 'discord.js';

export declare class FiltersManager {
    constructor(player: Player);

    /**
     * Player Class
     */
    private player: Player;

    /**
     * Player Filters Storage
     */
    private storage: Collection<string, string>;

    /**
     * Allows you to add your custom filter to the storage module
     * 
     * @param key Filter name
     * @param value Filter FFmpeg value
     * 
     * @returns The presence of an added filter in the storage or an object with an error
     */
    public add(key: string, value: string): Promise<DefaultData & ErrorData>;

    /**
     * Allows you to check the filter key for validity
     * 
     * @param key Filter name
     * 
     * @returns Key filter search result
     */
    public isExists(key: string): Promise<boolean>;
 
    /**
     * Allows you to get the module's filter object
     * 
     * @param key Filter name
     * 
     * @returns Filter object (name & value) or object with an error
     */
    public get(key: string): Promise<PlayerFilter & ErrorData>;
 
    /**
     * Allows you to get a collection of module filters (including custom filters)
     * 
     * @returns Filters collection
     */
    public list(): Promise<Collection<string, string>>;
 
    /**
     * Allows you to remove filters from the collection
     * 
     * @param key Filter name
     * 
     * @returns Filter removal status or error object
     */
    public delete(key: string): Promise<DefaultData & ErrorData>;

    /**
     * Method for initializing module filters storage
     */
    private init(): void;
}