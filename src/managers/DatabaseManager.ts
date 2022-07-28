import { existsSync, readFileSync, writeFileSync } from "fs";

import ms from "../modules/ms";

import { Player } from "../Player";
import { PlayerError } from "../PlayerError";

import errors from "../data/errors.json";

import { DatabaseConfig } from "./../../types/PlayerOptions.d";

/**
 * Class that controls Player Database Manager
 *
 * @class
 * @classdesc Player Database Manager Class
 */
export class DatabaseManager {
  private player: Player;

  private storage: object;

  public config: DatabaseConfig;

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
          .replace("{data}", "<DatabaseManager>")
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
     * Player Database Configuration
     *
     * @type {DatabaseConfig}
     */
    this.config = {
      path: player.options.databaseConfig.path,
      checkInterval: player.options.databaseConfig.checkInterval,
    };

    /**
     * Player Playlists Storage
     *
     * @type {object}
     * @private
     */
    this.storage = null;

    this.init();
  }

  /**
   * Method to get database object
   *
   * @example
   * const storage = client.player.database.get();
   * const guildPlaylists = storage['GuildID'];
   *
   * console.log(guildPlaylists);
   *
   * @returns {object} Database object
   */
  public get(): object {
    return this.storage;
  }

  /**
   * Method for writing data to the database
   *
   * @example
   * const storage = client.player.database.get();
   * storage['GuildID']['example'] = {};
   *
   * client.player.database.write(storage);
   *
   * @param {object} [data] Database object
   */
  public write(data?: object): void {
    return writeFileSync(
      this.config.path,
      JSON.stringify(data ? data : this.storage, null, "\t")
    );
  }

  /**
   * Allows you to initialize data for a single server
   *
   * @example
   * function getGuildStorage('GuildID') {
   *      // If there is no data, it will appear
   *      client.player.database.initGuild('GuildID);
   *
   *      const storage = client.player.database.get();
   *
   *      console.log(storage['GuildID']);
   * }
   *
   * getGuildStorage('GuildID');
   *
   * @param {string} guildID Discord Guild ID
   */
  public initGuild(guildID: string): void {
    if (!this.storage[guildID]) {
      this.storage[guildID] = {
        playlists: [],
      };
    }

    return this.write();
  }

  /**
   * Method for module database initialization
   *
   * @private
   */
  private init(): void {
    setInterval(async () => {
      if (!existsSync(this.config.path)) {
        writeFileSync(this.config.path, "{}", "utf-8");
      }

      this.storage = JSON.parse(readFileSync(this.config.path, "utf-8"));
    }, ms(this.config.checkInterval) as number);
  }
}
