import { Collection } from 'discord.js';

import type { Player } from '../Player';
import { PlayerError, PlayerErrorCode, requireParam } from '../PlayerError';

import { DefaultData, PlayerFilter } from '../types/PlayerData';

import filters from '../data/filters.json';

/**
 * Class that controls Player Filters Manager
 *
 * @class
 * @classdesc Player Filters Manager Class
 */
export class FiltersManager {
    private player: Player;

    private storage: Collection<string, string>;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<FiltersManager>');

        /**
         * Player Class
         *
         * @type {Player}
         * @private
         */
        this.player = player;

        /**
         * Player Filters Storage
         *
         * @type {Collection<string, string>}
         * @private
         */
        this.storage = new Collection();

        for(const filter of filters) this.storage.set(filter.name, filter.value);
    }

    /**
     * Allows you to register a new filter (the value is passed to FFmpeg as `-af`)
     *
     * @param {string} key Filter name
     * @param {string} value Filter value
     *
     * @example
     * const addData = await client.player.filters.add('quiet', 'volume=0.5');
     * if(addData.status) console.log('Filter has been registered!');
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if a parameter is missing, `FILTER_EXISTS` if the filter is already registered
     *
     * @returns {Promise<DefaultData>} Registration status
     */
    public async add(key: string, value: string): Promise<DefaultData> {
        requireParam(key, 'key', '<FiltersManager>.add');
        requireParam(value, 'value', '<FiltersManager>.add');

        if(this.storage.has(key)) throw new PlayerError(PlayerErrorCode.FILTER_EXISTS, { name: key });

        this.storage.set(key, value);

        return { status: this.storage.get(key) === value };
    }

    /**
     * Allows you to check whether a filter is registered
     *
     * @param {string} key Filter name
     *
     * @example
     * const exists = await client.player.filters.isExists('bassboost');
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the name is missing
     *
     * @returns {Promise<boolean>} `true` if the filter is registered
     */
    public async isExists(key: string): Promise<boolean> {
        requireParam(key, 'key', '<FiltersManager>.isExists');

        return this.storage.has(key);
    }

    /**
     * Allows you to get a filter by name
     *
     * @param {string} key Filter name
     *
     * @example
     * const filter = await client.player.filters.get('bassboost');
     *
     * console.log(filter.value);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the name is missing, `FILTER_NOT_FOUND` if the filter is not registered
     *
     * @returns {Promise<PlayerFilter>} Filter name and value
     */
    public async get(key: string): Promise<PlayerFilter> {
        requireParam(key, 'key', '<FiltersManager>.get');

        const value = this.storage.get(key);
        if(!value) throw new PlayerError(PlayerErrorCode.FILTER_NOT_FOUND, { name: key });

        return { name: key, value };
    }

    /**
     * Allows you to get all registered filters
     *
     * @example
     * const filters = await client.player.filters.list();
     *
     * console.log([...filters.keys()].join(', '));
     *
     * @returns {Promise<Collection<string, string>>} Filters by name
     */
    public async list(): Promise<Collection<string, string>> {
        return this.storage;
    }

    /**
     * Allows you to delete a filter
     *
     * @param {string} key Filter name
     *
     * @example
     * const deleteData = await client.player.filters.delete('quiet');
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the name is missing, `FILTER_NOT_FOUND` if the filter is not registered
     *
     * @returns {Promise<DefaultData>} Deletion status
     */
    public async delete(key: string): Promise<DefaultData> {
        requireParam(key, 'key', '<FiltersManager>.delete');

        if(!this.storage.has(key)) throw new PlayerError(PlayerErrorCode.FILTER_NOT_FOUND, { name: key });

        return { status: this.storage.delete(key) };
    }
}
