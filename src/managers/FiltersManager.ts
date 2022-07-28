import { Collection } from "discord.js";

import { DefaultData, ErrorData, PlayerFilter } from "../../types/PlayerData";
import { Player } from "../Player";
import { PlayerError } from "../PlayerError";

import errors from "../data/errors.json";
import filters from "../data/filters.json";

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
   */
  constructor(player: Player) {
    if (!player) {
      throw new PlayerError(
        errors.default.requireParam
          .replace("{param}", "player")
          .replace("{data}", "<FiltersManager>")
      );
    }

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

    this.init();
  }

  /**
   * Allows you to add your custom filter to the storage module
   *
   * @param {string} key Filter name
   * @param {string} value Filter FFmpeg value
   *
   * @example
   * const addFilterData = await client.player.filters.add('nightcore', 'asetrate=48000*1.25,aresample=48000,bass=g=5');
   * if(addFilterData?.status) return message.channel.send({ content: 'Filter nightcore added to storage!' });
   *
   * @returns {Promise<DefaultData | ErrorData>} The presence of an added filter in the storage or an object with an error
   */
  public add(key: string, value: string): Promise<DefaultData | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!key) {
        throw new PlayerError(
          this.player.errors.default.requireParam
            .replace("{param}", "key")
            .replace("{data}", "<FilterManager>.add")
        );
      }

      if (!value) {
        throw new PlayerError(
          this.player.errors.default.requireParam
            .replace("{param}", "value")
            .replace("{data}", "<FilterManager>.add")
        );
      }

      if (this.storage.get(key)) {
        return res({
          error: {
            code: 500,
            message: this.player.errors.filters.exists.replace("{name}", key),
          },
        });
      }

      this.storage.set(key, value);

      return res({ status: this.storage.get(key) === null });
    });
  }

  /**
   * Allows you to check the filter key for validity
   *
   * @param {string} key Filter name
   *
   * @example
   * const isValidFilter = await client.player.filters.isExists('nightcore');
   * if(isValidFilter) return message.channel.send({ content: 'Filter nightcore is valid!' });
   *
   * @returns {Promise<boolean>} Key filter search result
   */
  public isExists(key: string): Promise<boolean> {
    return new Promise(async (res, rej) => {
      if (!key) {
        throw new PlayerError(
          this.player.errors.default.requireParam
            .replace("{param}", "key")
            .replace("{data}", "<FilterManager>.isExists")
        );
      }

      return res(this.storage.get(key) ? true : false);
    });
  }

  /**
   * Allows you to get the module's filter object
   *
   * @param {string} key Filter name
   *
   * @example
   * const playerFilter = await client.player.filters.get('nightcore');
   * if(playerFilter?.name && playerFilter?.value) return message.channel.send({ content: `Filter name: ${playerFilter.name} | Filter value: ${playerFilter.value}` });
   *
   * @returns {Promise<PlayerFilter | ErrorData>} Filter object (name & value) or object with an error
   */
  public get(key: string): Promise<PlayerFilter | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!key) {
        throw new PlayerError(
          this.player.errors.default.requireParam
            .replace("{param}", "key")
            .replace("{data}", "<FilterManager>.get")
        );
      }

      const filterValue = this.storage.get(key);
      if (!filterValue) {
        return res({
          error: {
            code: 404,
            message: this.player.errors.filters.notFound.replace("{name}", key),
          },
        });
      }

      return res({ name: key, value: filterValue });
    });
  }

  /**
   * Allows you to get a collection of module filters (including custom filters)
   *
   * @example
   * const playerFilters = await client.player.filters.list();
   * return message.channel.send({ content: `Filters count: ${playerFilters.size}` });
   *
   * @returns {Promise<Collection<string, string>>} Filters collection
   */
  public list(): Promise<Collection<string, string>> {
    return new Promise(async (res, rej) => {
      return res(this.storage);
    });
  }

  /**
   * Allows you to remove filters from the collection
   *
   * @param {string} key Filter name
   *
   * @example
   * const deleteFilterData = await client.player.filters.delete('nightcore');
   * if(deleteFilterData?.status) return message.channel.send({ content: 'Filter nightcore deleted from module storage!' });
   *
   * @returns {Promise<DefaultData | ErrorData>} Filter removal status or error object
   */
  public delete(key: string): Promise<DefaultData | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!key) {
        throw new PlayerError(
          this.player.errors.default.requireParam
            .replace("{param}", "key")
            .replace("{data}", "<FilterManager>.delete")
        );
      }

      if (!this.storage.get(key)) {
        return res({
          error: {
            code: 404,
            message: this.player.errors.filters.notFound.replace("{name}", key),
          },
        });
      }

      return res({ status: this.storage.delete(key) });
    });
  }

  /**
   * Method for initializing module filters storage
   *
   * @private
   */
  private init(): void {
    for (let i = 0; i < filters.length; i++) {
      if (!this.storage.get(filters[i]?.name)) {
        this.storage.set(filters[i]?.name, filters[i]?.value);
      }
    }
  }
}
