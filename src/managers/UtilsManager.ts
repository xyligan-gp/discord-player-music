import type { Player } from '../Player';
import { requireParam } from '../PlayerError';

import { PlayerOptions, ResolvedPlayerOptions } from '../types/PlayerOptions';

// Default reactions of the reaction collector
const DEFAULT_REACTIONS: Array<string> = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟'];

/**
 * Returns the value if it has the expected type, otherwise the default value
 *
 * @param {unknown} value Value to check
 * @param {T} fallback Default value
 * @param {function} [valid] Additional check
 *
 * @returns {T} Correct value
 * @private
 */
function pick<T extends string | number | boolean>(value: unknown, fallback: T, valid: (value: T) => boolean = () => true): T {
    return typeof value === typeof fallback && valid(value as T) ? value as T : fallback;
}

/**
 * Class that controls Player Utils Manager
 *
 * @class
 * @classdesc Player Utils Manager Class
 */
export class UtilsManager {
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
            autoAddingTracks: pick(options.autoAddingTracks, true),
            searchResultsLimit: pick(options.searchResultsLimit, 10, value => value > 0),
            synchronLoop: pick(options.synchronLoop, true),
            defaultVolume: pick(options.defaultVolume, 5, value => value > 0),
            playlistLimit: pick(options.playlistLimit, 100, value => value > 0),
            prefetchSeconds: pick(options.prefetchSeconds, 20, value => value >= 0),
            cookies: typeof options.cookies === 'string' && options.cookies.length > 0 ? options.cookies : undefined,
            sourceFailureThreshold: pick(options.sourceFailureThreshold, 1, value => value >= 1),
            sourceCooldown: pick(options.sourceCooldown, '10m', value => value.length > 0),
            sources: Array.isArray(options.sources) && options.sources.length ? options.sources : undefined,
            lyrics: typeof options.lyrics?.search === 'function' ? options.lyrics : undefined,

            progressConfig: {
                size: pick(progress.size, 11, value => value > 1),
                line: pick(progress.line, '▬', value => value.length > 0),
                slider: pick(progress.slider, '🔘', value => value.length > 0)
            },

            collectorsConfig: {
                message: {
                    time: pick(message.time, '1m', value => value.length > 0),
                    attempts: pick(message.attempts, 1, value => value > 0),
                    cancel: message.cancel === false ? false : pick(message.cancel, 'cancel', value => value.length > 0)
                },

                reaction: {
                    time: pick(reaction.time, '30s', value => value.length > 0),
                    attempts: pick(reaction.attempts, 1, value => value > 0),
                    reactions: Array.isArray(reaction.reactions) && reaction.reactions.length ? reaction.reactions : DEFAULT_REACTIONS,
                    cancel: reaction.cancel === false ? false : pick(reaction.cancel, '❌', value => value.length > 0)
                }
            }
        }
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
     * Allows you to generate a unique 15-digit ID
     *
     * @example
     * const uniqueID = client.player.utils.getUniqueID();
     *
     * // Result: 308146705825713
     * console.log(uniqueID);
     *
     * @returns {string} Unique ID
     */
    public getUniqueID(): string {
        let uniqueID = '';

        for(let i = 0; i < 15; i++) uniqueID += Math.floor(Math.random() * 10).toString();

        return uniqueID;
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
     * @returns {Promise<number>} Track duration in seconds (0 if it can not be received)
     */
    public async getTrackDuration(url: string): Promise<number> {
        const trackInfo = await this.player.sources.resolve(url).catch(() => null);

        return trackInfo?.seconds || 0;
    }
}
