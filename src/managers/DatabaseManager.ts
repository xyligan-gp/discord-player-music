import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import ms from '../modules/ms';

import type { Player } from '../Player';
import { requireParam } from '../PlayerError';

import { DatabaseManagerConfiguration, DatabaseStorage, GuildPlaylist, PlaylistTrack } from '../types/PlayerData';

// Value of the field if it has the expected type, otherwise the fallback (and the flag that the data was changed)
function fix<T extends string | number | null>(value: unknown, type: 'string' | 'number', fallback: T, changes: { count: number }): T | string | number {
    if(typeof value === type) return value as string | number;
    if(value === null && fallback === null) return null as T;

    changes.count++;

    return fallback;
}

// Brings the data of the database file to the current format: the structure of 1.x is kept, missing or invalid fields get default values
function normalizeStorage(raw: unknown): { storage: DatabaseStorage, changed: boolean } {
    const changes = { count: 0 };
    const storage: DatabaseStorage = {};

    if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return { storage, changed: true };

    for(const [guildID, guildData] of Object.entries(raw as Record<string, unknown>)) {
        const rawPlaylists = (guildData as { playlists?: unknown } | null)?.playlists;

        if(!Array.isArray(rawPlaylists)) changes.count++;

        const playlists: Array<GuildPlaylist> = [];

        for(const item of Array.isArray(rawPlaylists) ? rawPlaylists : []) {
            const playlist = item as Partial<Record<keyof GuildPlaylist, unknown>> | null;

            if(!playlist || typeof playlist !== 'object' || typeof playlist.id !== 'string') {
                changes.count++;

                continue;
            }

            const tracks: Array<PlaylistTrack> = [];

            for(const track of Array.isArray(playlist.tracks) ? playlist.tracks : []) {
                if(track && typeof track.url === 'string') tracks.push({ url: track.url, title: typeof track.title === 'string' ? track.title : track.url });
                else changes.count++;
            }

            if(!Array.isArray(playlist.tracks)) changes.count++;

            playlists.push({
                id: playlist.id,
                title: fix(playlist.title, 'string', `Playlist #${playlist.id}`, changes) as string,
                author: fix(playlist.author, 'string', '', changes) as string,
                created: fix(playlist.created, 'number', 0, changes) as number,
                updated: fix(playlist.updated, 'number', null, changes) as number | null,
                duration: fix(playlist.duration, 'number', 0, changes) as number,
                lastPlaying: fix(playlist.lastPlaying, 'number', null, changes) as number | null,
                tracks
            })
        }

        storage[guildID] = { playlists };
    }

    return { storage, changed: changes.count > 0 };
}

/**
 * Class that controls Player Database Manager
 *
 * @class
 * @classdesc Player Database Manager Class
 */
export class DatabaseManager {
    private player: Player;

    private storage: DatabaseStorage;
    private modifiedAt: number;

    public config: DatabaseManagerConfiguration;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<DatabaseManager>');

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
         * @type {DatabaseManagerConfiguration}
         */
        this.config = {
            path: player.options.databaseConfig.path,
            checkInterval: player.options.databaseConfig.checkInterval
        }

        /**
         * Player Playlists Storage (loaded synchronously, so it is available right after the player is created)
         *
         * @type {object}
         * @private
         */
        this.storage = {};

        /**
         * Modification time of the database file that was loaded last
         *
         * @type {number}
         * @private
         */
        this.modifiedAt = 0;

        this.load();
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
     * @returns {DatabaseStorage} Database object
     */
    public get(): DatabaseStorage {
        return this.storage;
    }

    /**
     * Method for writing data to the database. The file is replaced atomically, so it can not be left half-written.
     *
     * @example
     * const storage = client.player.database.get();
     * storage['GuildID']['example'] = {};
     *
     * client.player.database.write(storage);
     *
     * @param {DatabaseStorage} [data] Database object
     */
    public write(data?: DatabaseStorage): void {
        if(data) this.storage = data;

        const temporaryPath = `${this.config.path}.tmp`;

        mkdirSync(dirname(this.config.path), { recursive: true });

        writeFileSync(temporaryPath, JSON.stringify(this.storage, null, '\t'));
        renameSync(temporaryPath, this.config.path);

        this.modifiedAt = statSync(this.config.path).mtimeMs;
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
        requireParam(guildID, 'guildID', '<DatabaseManager>.initGuild');

        if(!this.storage[guildID]) {
            this.storage[guildID] = { playlists: [] };

            this.write();
        }
    }

    /**
     * Loads the database file (and creates it if it does not exist).
     * Data written by earlier versions is normalized, and a damaged file is saved next to the original (`.corrupt-<time>`) instead of crashing the bot.
     * 
     * @fires Player#error
     * @private
     */
    private load(): void {
        if(!existsSync(this.config.path)) {
            this.storage = {};

            return this.write();
        }

        let raw: unknown;

        try {
            raw = JSON.parse(readFileSync(this.config.path, 'utf-8') || '{}');
        }catch(error) {
            const backupPath = `${this.config.path}.corrupt-${Date.now()}`;

            renameSync(this.config.path, backupPath);

            this.storage = {};
            this.write();

            // Deferred, so the listeners added right after `new Player()` receive it
            queueMicrotask(() => this.player.emit('error', { method: '<DatabaseManager>.load', error: new Error(`The database file is damaged and was moved to '${backupPath}': ${(error as Error).message}`) }));

            return;
        }

        const { storage, changed } = normalizeStorage(raw);

        this.storage = storage;

        if(changed) this.write();
        else this.modifiedAt = statSync(this.config.path).mtimeMs;
    }

    /**
     * Method for module database initialization: the file is reloaded when it was changed by something else (a manual edit or another process)
     *
     * @private
     */
    private init(): void {
        const interval = setInterval(() => {
            try {
                if(existsSync(this.config.path) && statSync(this.config.path).mtimeMs !== this.modifiedAt) this.load();
            }catch(error) {
                this.player.emit('error', { method: '<DatabaseManager>.init', error: error as Error });
            }
        }, ms(this.config.checkInterval) as number);

        // The timer must not keep the process alive
        interval.unref();
    }
}
