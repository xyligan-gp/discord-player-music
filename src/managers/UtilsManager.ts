import { Player } from '../Player';
import { PlayerError } from '../PlayerError';

import { PlayerOptions } from '../../types/PlayerOptions';

import ytdl from '../modules/dpm-ytdl';

import errors from '../data/errors.json';

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
     */
    constructor(player: Player) {
        if(!player) throw new PlayerError(errors.default.requireParam.replace('{param}', 'player').replace('{data}', '<UtilsManager>'));
        /**
         * Player Class
         * 
         * @type {Player}
         * @private
         */
        this.player = player;
    }

    /**
     * Allows you to format numbers in a familiar form for people
     * @param {Array<number>} data numbers Array
     * 
     * @example
     * const formatData = client.player.utils.formatnumbers([1, 2, 30]);
     * 
     * // Result: ['01', '02', '30']
     * console.log(formatData);
     * 
     * @returns {Array<string>} Returns an array of formatted numbers
     */
    public formatnumbers(data: Array<number>): Array<string> {
        let array: Array<string> = [];

        for(let i = 0; i < data.length; i++) {
            if(Number(data[i]) < 10) array.push(`0${data[i]}`);
            else array.push(data[i].toString());
        }

        return array;
    }

    /**
     * Allows you to format the duration to the usual form
     * 
     * @param {number} value Duration value
     * 
     * @example
     * const formatData = client.player.utils.formatDuration(300);
     * 
     * // Result: '00:05:00'
     * console.log(formatData);
     * 
     * @returns {string} Formatted duration value
     */
    public formatDuration(value: number): string {
        const duration = {
            hours: Math.floor(value / 3600),
            minutes: Math.floor(value / 60 % 60),
            seconds: Math.floor(value % 60)
        }

        const durationData = this.formatnumbers([duration.hours, duration.minutes, duration.seconds]);

        return `${durationData[0]}:${durationData[1]}:${durationData[2]}`;
    }

    /**
     * Method for checking module options
     * 
     * @param {PlayerOptions} [options] Module options
     * 
     * @example
     * const playerOptions = client.player.utils.checkOptions();
     * console.log(playerOptions);
     * 
     * @returns {PlayerOptions} Correct module options
     */
    public checkOptions(options?: PlayerOptions): PlayerOptions {
        if(!options) {
            options = {
                autoAddingTracks: true,
                searchResultsLimit: 10,
                synchronLoop: true,
                defaultVolume: 5,

                databaseConfig: {
                    path: './dpm.playlists.json',
                    checkInterval: '5s'
                },

                progressConfig: {
                    size: 11,
                    line: '▬',
                    slider: '🔘'
                },

                collectorsConfig: {
                    message: {
                        time: '1m',
                        attempts: 1
                    },

                    reaction: {
                        time: '30s',
                        attempts: 1,
                        reactions: ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟']
                    }
                }
            }
        }else{
            if(typeof options?.autoAddingTracks != 'boolean') options.autoAddingTracks = true;
            if(!options.searchResultsLimit || typeof options.searchResultsLimit != 'number') options.searchResultsLimit = 10;
            if(!options.synchronLoop || typeof options.synchronLoop != 'boolean') options.synchronLoop = true;
            if(!options.defaultVolume || typeof options.defaultVolume != 'number') options.defaultVolume = 5;

            if(!options.databaseConfig || typeof options.databaseConfig != 'object') {
                options.databaseConfig = {
                    path: './dpm.playlists.json',
                    checkInterval: '5s'
                }
            }else{
                if(!options.databaseConfig.path || typeof options.databaseConfig.path != 'string') options.databaseConfig.path = './dpm.playlists.json';
                if(!options.databaseConfig.checkInterval || typeof options.databaseConfig.checkInterval != 'string') options.databaseConfig.checkInterval = '5s';
            }

            if(!options.progressConfig || typeof options.progressConfig != 'object') {
                options.progressConfig = {
                    size: 11,
                    line: '▬',
                    slider: '🔘'
                }
            }else{
                if(!options.progressConfig.size || typeof options.progressConfig.size != 'number') options.progressConfig.size = 11;
                if(!options.progressConfig.line || typeof options.progressConfig.line != 'string') options.progressConfig.line = '▬';
                if(!options.progressConfig.slider || typeof options.progressConfig.slider != 'string') options.progressConfig.slider = '🔘';
            }

            if(!options.collectorsConfig || typeof options.collectorsConfig != 'object') {
                options.collectorsConfig = {
                    message: {
                        time: '1m',
                        attempts: 1
                    },

                    reaction: {
                        time: '30s',
                        attempts: 1,
                        reactions: ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟']
                    }
                }
            }else{
                if(!options.collectorsConfig.message || typeof options.collectorsConfig.message != 'object') {
                    options.collectorsConfig.message = {
                        time: '1m',
                        attempts: 1
                    }
                }else{
                    if(!options.collectorsConfig.message.time || typeof options.collectorsConfig.message.time != 'string') options.collectorsConfig.message.time = '1m';
                    if(!options.collectorsConfig.message.attempts || typeof options.collectorsConfig.message.attempts != 'number') options.collectorsConfig.message.attempts = 1;
                }

                if(!options.collectorsConfig.reaction || typeof options.collectorsConfig.reaction != 'object') {
                    options.collectorsConfig.reaction = {
                        time: '30s',
                        attempts: 1,
                        reactions: ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟']
                    }
                }else{
                    if(!options.collectorsConfig.reaction.time || typeof options.collectorsConfig.reaction.time != 'string') options.collectorsConfig.reaction.time = '30s';
                    if(!options.collectorsConfig.reaction.attempts || typeof options.collectorsConfig.reaction.attempts != 'number') options.collectorsConfig.reaction.attempts = 1;
                    if(!options.collectorsConfig.reaction.reactions || !options.collectorsConfig.reaction.reactions?.length) options.collectorsConfig.reaction.reactions = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣', '🔟'];
                }
            }
        }

        return options;
    }

    /**
     * Allows you to create an empty progress bar
     * 
     * @example
     * const progressBar = client.player.utils.createEmptyProgress();
     * 
     * // Result: '🔘▬▬▬▬▬▬▬▬▬▬'
     * console.log(progressBar);
     * 
     * @returns {string} Empty progress bar
     */
    public createEmptyProgress(): string {
        let bar: string = this.player.options.progressConfig.slider;

        for(let i = 0; i < this.player.options.progressConfig.size - 1; i++) {
            bar += this.player.options.progressConfig.line;
        }

        return bar;
    }

    /**
     * Allows you to get a unique ID
     * 
     * @example
     * const id = client.player.utils.getUniqueID();
     * 
     * // Result: '632342263918468'
     * console.log(id);
     * 
     * @returns {string} Unique ID
     */
    public getUniqueID(): string {
        let uniqueID = '';
        
        for(let i = 0; i < 15; i++) {
            const randomSymbol = (Math.floor(Math.random() * (9 - 0 + 1)) + 0).toString();

            uniqueID += randomSymbol;
        }

        return uniqueID;
    }

    /**
     * Allows you to find out the duration of the track
     * 
     * @param {string} url Track url
     * 
     * @example
     * const trackDurationData = await client.player.utils.getTrackDuration('https://youtube.com/watch?v=Vt2TeOptLxE');
     * 
     * // Result: 307
     * console.log(trackDurationData);
     * 
     * @returns {Promise<number>} Track duration
     */
    public getTrackDuration(url: string): Promise<number> {
        return new Promise(async (res, rej) => {
            const trackInfo = await ytdl.getInfo(url).catch((error: Error) => {
                return res(0);
            });

            return res(Number((trackInfo as any)?.videoDetails?.lengthSeconds) || 0);
        })
    }
}