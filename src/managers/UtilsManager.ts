import type { Player } from '../Player';
import { requireParam } from '../PlayerError';

import { PlayerOptions, ResolvedPlayerOptions } from '../types/PlayerOptions';

// Default reactions of the reaction collector
const DEFAULT_REACTIONS: Array<string> = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟'];

/**
 * Class that controls Player Utils Manager
 *
 * @class
 * @classdesc Player Utils Manager Class
 */
export class UtilsManager {
    // Milliseconds in the units of a duration
    private static readonly SECOND = 1000;
    private static readonly MINUTE = this.SECOND * 60;
    private static readonly HOUR = this.MINUTE * 60;
    private static readonly DAY = this.HOUR * 24;
    private static readonly WEEK = this.DAY * 7;
    private static readonly YEAR = this.DAY * 365.25;

    private player: Player;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<UtilsManager>');

        /**
         * Player Class
         *
         * @type {Player}
         * @private
         */
        this.player = player;
    }

    /**
     * Allows you to format numbers to the `00` form
     *
     * @param {Array<number>} data Array of numbers
     *
     * @example
     * const formatData = client.player.utils.formatnumbers([1, 2, 3, 10]);
     *
     * // Result: ['01', '02', '03', '10']
     * console.log(formatData);
     *
     * @returns {Array<string>} Array of formatted numbers
     */
    public formatnumbers(data: Array<number>): Array<string> {
        return data.map(value => Number(value) < 10 ? `0${value}` : value.toString());
    }

    /**
     * Allows you to format a duration in seconds to the `00:00:00` form
     *
     * @param {number} value Duration in seconds
     *
     * @example
     * const duration = client.player.utils.formatDuration(307);
     *
     * // Result: 00:05:07
     * console.log(duration);
     *
     * @returns {string} Formatted duration
     */
    public formatDuration(value: number): string {
        const [hours, minutes, seconds] = this.formatnumbers([Math.floor(value / 3600), Math.floor(value / 60 % 60), Math.floor(value % 60)]);

        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Allows you to read a duration written as text and get milliseconds. A number without a unit is milliseconds.
     *
     * @param {string} value Duration: a number with an optional unit, for example `500`, `10s`, `1.5 hours`, `2d`, `1 week`
     *
     * @example
     * const milliseconds = client.player.utils.parseDuration('10m');
     *
     * // Result: 600000
     * console.log(milliseconds);
     *
     * @throws {Error} If the value is not a non-empty string with a valid duration
     *
     * @returns {number} Milliseconds
     */
    public parseDuration(value: string): number {
        if(typeof value === 'string' && value.length > 0) {
            const parsed = this.parseUnits(value);

            if(parsed !== undefined) return parsed;
        }

        throw new Error(`'value' is not a non-empty string with a valid duration! 'value' = '${JSON.stringify(value)}'`);
    }

    /**
     * Allows you to split milliseconds into days, hours, minutes and seconds (every part is a whole number, the hours, minutes and seconds are
     * the remainders: `90061000` is 1 day, 1 hour, 1 minute and 1 second)
     *
     * @param {number} value Milliseconds
     *
     * @example
     * const time = client.player.utils.splitMilliseconds(90061000);
     *
     * // Result: { days: 1, hours: 1, minutes: 1, seconds: 1 }
     * console.log(time);
     *
     * @returns {{ days: number, hours: number, minutes: number, seconds: number }} Time parts
     */
    public splitMilliseconds(value: number): { days: number, hours: number, minutes: number, seconds: number } {
        return {
            days: Math.floor(value / UtilsManager.DAY),
            hours: Math.floor(value / UtilsManager.HOUR % 24),
            minutes: Math.floor(value / UtilsManager.MINUTE % 60),
            seconds: Math.floor(value / UtilsManager.SECOND % 60)
        };
    }

    /**
     * Allows you to write milliseconds as a short or a long text
     *
     * @param {number} value Milliseconds
     * @param {object} [options] Formatting options
     * @param {boolean} [options.long=false] `true` gives `2 minutes` instead of `2m`
     *
     * @example
     * const text = client.player.utils.formatMilliseconds(120000, { long: true });
     *
     * // Result: 2 minutes
     * console.log(text);
     *
     * @throws {Error} If the value is not a finite number
     *
     * @returns {string} Text
     */
    public formatMilliseconds(value: number, options: { long?: boolean } = {}): string {
        if(typeof value !== 'number' || !isFinite(value)) throw new Error(`'value' is not a valid number! 'value' = '${JSON.stringify(value)}'`);

        return options.long ? this.formatLong(value) : this.formatShort(value);
    }

    /**
     * Reads a number with a unit (`10s`, `1.5 hours`)
     *
     * @param {string} value Text
     *
     * @returns {number | undefined} Milliseconds, or `undefined` if the text is not a duration
     * @private
     */
    private parseUnits(value: string): number | undefined {
        if(value.length > 100) return undefined;

        const match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(value);
        if(!match) return undefined;

        const n = parseFloat(match[1]);
        const type = (match[2] || 'ms').toLowerCase();

        switch(type) {
            case 'years':
            case 'year':
            case 'yrs':
            case 'yr':
            case 'y':
                return n * UtilsManager.YEAR;

            case 'weeks':
            case 'week':
            case 'w':
                return n * UtilsManager.WEEK;

            case 'days':
            case 'day':
            case 'd':
                return n * UtilsManager.DAY;

            case 'hours':
            case 'hour':
            case 'hrs':
            case 'hr':
            case 'h':
                return n * UtilsManager.HOUR;

            case 'minutes':
            case 'minute':
            case 'mins':
            case 'min':
            case 'm':
                return n * UtilsManager.MINUTE;

            case 'seconds':
            case 'second':
            case 'secs':
            case 'sec':
            case 's':
                return n * UtilsManager.SECOND;

            case 'milliseconds':
            case 'millisecond':
            case 'msecs':
            case 'msec':
            case 'ms':
                return n;

            default: return undefined;
        }
    }

    /**
     * Short text: `2m`
     *
     * @param {number} value Milliseconds
     *
     * @returns {string} Text
     * @private
     */
    private formatShort(value: number): string {
        const abs = Math.abs(value);

        if(abs >= UtilsManager.DAY) return Math.round(value / UtilsManager.DAY) + 'd';
        if(abs >= UtilsManager.HOUR) return Math.round(value / UtilsManager.HOUR) + 'h';
        if(abs >= UtilsManager.MINUTE) return Math.round(value / UtilsManager.MINUTE) + 'm';
        if(abs >= UtilsManager.SECOND) return Math.round(value / UtilsManager.SECOND) + 's';

        return value + 'ms';
    }

    /**
     * Long text: `2 minutes`
     *
     * @param {number} value Milliseconds
     *
     * @returns {string} Text
     * @private
     */
    private formatLong(value: number): string {
        const abs = Math.abs(value);

        if(abs >= UtilsManager.DAY) return this.plural(value, abs, UtilsManager.DAY, 'day');
        if(abs >= UtilsManager.HOUR) return this.plural(value, abs, UtilsManager.HOUR, 'hour');
        if(abs >= UtilsManager.MINUTE) return this.plural(value, abs, UtilsManager.MINUTE, 'minute');
        if(abs >= UtilsManager.SECOND) return this.plural(value, abs, UtilsManager.SECOND, 'second');

        return value + ' ms';
    }

    /**
     * Writes a number of units with the unit name (the plural form is used from one and a half units)
     *
     * @param {number} value Milliseconds
     * @param {number} abs Absolute value of the milliseconds
     * @param {number} unit Milliseconds in one unit
     * @param {string} name Unit name
     *
     * @returns {string} Text
     * @private
     */
    private plural(value: number, abs: number, unit: number, name: string): string {
        return Math.round(value / unit) + ' ' + name + (abs >= unit * 1.5 ? 's' : '');
    }

    /**
     * Allows you to check the module options and fill the missing or invalid values with the defaults
     *
     * @param {PlayerOptions} [options] Module options
     *
     * @example
     * const playerOptions = client.player.utils.checkOptions();
     * console.log(playerOptions);
     *
     * @returns {PlayerOptions} Correct module options
     */
    public checkOptions(options: PlayerOptions = {}): ResolvedPlayerOptions {
        const progress = options.progressConfig ?? {};
        const message = options.collectorsConfig?.message ?? {};
        const reaction = options.collectorsConfig?.reaction ?? {};

        return {
            autoAddingTracks: this.pick(options.autoAddingTracks, true, undefined, 'autoAddingTracks'),
            searchResultsLimit: this.pick(options.searchResultsLimit, 10, value => value > 0, 'searchResultsLimit'),
            synchronLoop: this.pick(options.synchronLoop, true, undefined, 'synchronLoop'),
            defaultVolume: this.pick(options.defaultVolume, 5, value => value > 0, 'defaultVolume'),
            playlistLimit: this.pick(options.playlistLimit, 100, value => value > 0, 'playlistLimit'),
            prefetchSeconds: this.pick(options.prefetchSeconds, 20, value => value >= 0, 'prefetchSeconds'),
            cookies: this.validated('cookies', options.cookies, value => typeof value === 'string' && value.length > 0),
            sourceFailureThreshold: this.pick(options.sourceFailureThreshold, 1, value => value >= 1, 'sourceFailureThreshold'),
            sourceCooldown: this.pick(options.sourceCooldown, '10m', value => value.length > 0, 'sourceCooldown'),
            sources: this.validated('sources', options.sources, value => Array.isArray(value) && value.length > 0),
            lyrics: this.validated('lyrics', options.lyrics, value => typeof (value as { search?: unknown } | null)?.search === 'function'),

            progressConfig: {
                size: this.pick(progress.size, 11, value => value > 1, 'progressConfig.size'),
                line: this.pick(progress.line, '▬', value => value.length > 0, 'progressConfig.line'),
                slider: this.pick(progress.slider, '🔘', value => value.length > 0, 'progressConfig.slider')
            },

            collectorsConfig: {
                message: {
                    time: this.pick(message.time, '1m', value => value.length > 0, 'collectorsConfig.message.time'),
                    attempts: this.pick(message.attempts, 1, value => value > 0, 'collectorsConfig.message.attempts'),
                    cancel: message.cancel === false ? false : this.pick(message.cancel, 'cancel', value => value.length > 0, 'collectorsConfig.message.cancel')
                },

                reaction: {
                    time: this.pick(reaction.time, '30s', value => value.length > 0, 'collectorsConfig.reaction.time'),
                    attempts: this.pick(reaction.attempts, 1, value => value > 0, 'collectorsConfig.reaction.attempts'),
                    reactions: this.validated('collectorsConfig.reaction.reactions', reaction.reactions, value => Array.isArray(value) && value.length > 0) ?? DEFAULT_REACTIONS,
                    cancel: reaction.cancel === false ? false : this.pick(reaction.cancel, '❌', value => value.length > 0, 'collectorsConfig.reaction.cancel')
                }
            }
        }
    }

    /**
     * Returns the value if it has the expected type, otherwise the default value (and tells about it when the option was passed)
     *
     * @param {unknown} value Value to check
     * @param {T} fallback Default value
     * @param {function} [valid] Additional check
     * @param {string} [name] Option name for the warning (nothing is reported when it is not passed)
     *
     * @returns {T} Correct value
     * @private
     */
    private pick<T extends string | number | boolean>(value: unknown, fallback: T, valid: (value: T) => boolean = () => true, name?: string): T {
        if(typeof value === typeof fallback && valid(value as T)) return value as T;

        // An option that was passed but is wrong is reported (a missing option silently gets its default value)
        if(name && value !== undefined) this.warnOption(name, value, fallback);

        return fallback;
    }

    /**
     * Tells in the console that an option is invalid and its default value is used
     *
     * @param {string} name Option name (for example `collectorsConfig.message.time`)
     * @param {unknown} value Received value
     * @param {unknown} fallback Value that is used instead
     * @private
     */
    private warnOption(name: string, value: unknown, fallback: unknown): void {
        let received: string;

        try {
            received = JSON.stringify(value) ?? String(value);
        }catch {
            received = String(value);
        }

        console.warn(`[discord-player-music] Option "${name}" is invalid (received ${received}), using ${JSON.stringify(fallback)} instead.`);
    }

    /**
     * Returns the option when it is valid, otherwise `undefined` (and tells about it when the option was passed)
     *
     * @param {string} name Option name
     * @param {T | undefined} value Option value
     * @param {function} valid Validity check
     *
     * @returns {T | undefined} The value or `undefined`
     * @private
     */
    private validated<T>(name: string, value: T | undefined, valid: (value: T) => boolean): T | undefined {
        if(value === undefined) return undefined;
        if(valid(value)) return value;

        this.warnOption(name, value, undefined);

        return undefined;
    }

    /**
     * Allows you to create an empty track progress bar
     *
     * @example
     * const emptyProgress = client.player.utils.createEmptyProgress();
     *
     * // Result: 🔘▬▬▬▬▬▬▬▬▬▬
     * console.log(emptyProgress);
     *
     * @returns {string} Empty progress bar
     */
    public createEmptyProgress(): string {
        const { slider, line, size } = this.player.options.progressConfig;

        return slider + line.repeat(size - 1);
    }

    /**
     * Allows you to find out the duration of the track
     *
     * @param {string} url Track url
     *
     * @example
     * const trackDuration = await client.player.utils.getTrackDuration('https://youtube.com/watch?v=Vt2TeOptLxE');
     *
     * // Result: 307
     * console.log(trackDuration);
     *
     * @deprecated It stays for the code of 1.x and will be removed. The duration is in the tracks that `player.search()` returns (`track.duration`), and `player.sources.resolve(url)` gives `seconds`.
     *
     * @returns {Promise<number>} Track duration in seconds (0 if it can not be received)
     */
    public async getTrackDuration(url: string): Promise<number> {
        const trackInfo = await this.player.sources.resolve(url).catch(() => null);

        return trackInfo?.seconds || 0;
    }
}
