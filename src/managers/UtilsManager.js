const { Client, Collection, Guild, GuildMember, Message, Permissions } = require('discord.js');
const ytdl = require('../modules/dpm-ytdl.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

const QueueManager = require('./QueueManager.js');

class UtilsManager {
    /**
     * @param {Client} client Discord Client
     * @param {DiscordPlayerMusicOptions} options Player Options
     * @param {Collection<String, QueueManager>} queue Queue Manager
     * @param {String} mode Player mode of operation
    */
    constructor(client, options, queue, mode) {
        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Options
         * @type {DiscordPlayerMusicOptions}
        */
        this.options = options;

        /**
         * Player Queue Manager
         * @type {Collection<String, QueueManager>}
        */
        this.queue = queue;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = mode;

        /**
         * Utils Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['checkPermissions', 'createCollector', 'createStream', 'generateStreamOptions', 'formatNumbers'];

        /**
         * Utils Manager Methods Count
         * @type {Number}
        */
        this.size = this.methods.length;
    }

    /**
     * Method for checking user permissions
     * @param {GuildMember} member Guild Member
     * @param {Array<Permissions>} permissions Permissions Array
     * @returns {Promise<Boolean>} Returns the status of the user permissions
    */
    checkPermissions(member, permissions) {
        return new Promise(async (res, rej) => {
            return res(member.permissions.has(permissions));
        })
    }

    /**
     * Method for creating custom collectors
     * @param {Message} message Discord Message
     * @param {'message' | 'reaction'} type Collector Type
     * @returns {Promise<null>} 
    */
    createCollector(message, type) {
        return new Promise(async (res, rej) => {
            switch(type) {
                case 'message': {
                    return res(null);
                }

                case 'reaction': {
                    return res(null);
                }
            }
        })
    }

    /**
     * Method for creating a server stream
     * @param {Guild} guild Discord Guild
     * @returns {Promise<void>}
    */
    createStream(guild) {
        return new Promise(async (res, rej) => {
            switch(this.mode) {
                case '1': {
                    try {
                        const queue = await this.queue.get(guild.id);
                        if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));
        
                        const songInfo = await ytdl.getInfo(queue.songs[0].url);
        
                        const streamOptions = await this.generateStreamOptions(guild);
        
                        return ytdl(songInfo, streamOptions);
                    } catch (error) {
                        rej(error);
                    }
                }

                case '2': {
                    //to be continued
                }
            }
        })
    }

    /**
     * Method for generating options for stream
     * @param {Guild} guild Discord Guild
     * @returns {Promise<{StreamOptions}>} Returns options for creating a stream
    */
    generateStreamOptions(guild) {
        return new Promise(async (res, rej) => {
            const queue = await this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            const encoderArgs = queue.filter ? ['af', [queue.filter]] : null;

            const options = {
                opusEncoded: true,
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                encoderArgs,
                dlChunkSize: 0
            }

            return res(options);
        })
    }

    /**
     * Method for formatting numbers
     * @param {Array<Number>} numbersArray Numbers Array
     * @returns {Array<String | Number>} Returns an array with formatted numbers
    */
    formatNumbers(numbersArray) {
        return new Promise(async (res, rej) => {
            var numberArray = [];

            for (let i = 0; i < numbersArray.length; i++) {
                if (Number(numbersArray[i]) < 10) {
                    numberArray.push('0' + numbersArray[i]);
                } else {
                    numberArray.push(String(numbersArray[i]));
                }
            }

            return res(numberArray);
        })
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} searchResultsLimit Limit the number of results when searching for songs
 * @type {Object}
*/

/**
 * @typedef StreamOptions
 * @property {Boolean} opusEncoded Stream Encoding
 * @property {String} filter Stream YTDL Filter
 * @property {String} quality Stream Quality
 * @property {Number} highWaterMark Stream HighWaterMark
 * @property {Array<String>} encoderArgs Stream FFMPEG Filters
 * @property {Number} dlChunkSize Stream Chunk Size
 * @type {Object}
*/

module.exports = UtilsManager;