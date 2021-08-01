const { Client, Collection, Guild, GuildMember, Message, Permissions, version } = require('discord.js');
const ytdl = require('../modules/dpm-ytdl.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

const QueueManager = require('./QueueManager.js');

class UtilsManager {
    /**
     * @param {Client} client Discord Client
     * @param {Collection<String, QueueManager>} queue Queue Manager
    */
    constructor(client, queue) {
        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Queue Manager
         * @type {Collection<String, QueueManager>}
        */
        this.queue = queue;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = version.startsWith('12') ? '1' : '2';

        /**
         * Utils Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['checkOptions', 'checkPermissions', 'createCollector', 'createStream', 'generateStreamOptions', 'formatNumbers'];

        /**
         * Utils Manager Methods Count
         * @type {Number}
        */
        this.size = this.methods.length;
    }

    /**
     * Method for validating Player options
     * @param {DiscordPlayerMusicOptions} options Player Options
     * @returns {DiscordPlayerMusicOptions} Returns valid Player options
    */
    checkOptions(options) {
        if(!options) {
            options = {
                searchResultsLimit: 10,
                searchCollector: true,

                searchCollectorConfig: {
                    type: 'message',
                    count: 10
                }
            }
        }else{
            if(!options.searchResultsLimit) options.searchResultsLimit = 10;
            if(typeof options.searchResultsLimit != 'number') options.searchResultsLimit = 10;
            if(options.searchResultsLimit < 1) options.searchResultsLimit = 10;

            if(typeof options.searchCollector != 'boolean') options.searchCollector = true;

            if(!options.searchCollectorConfig) options.searchCollectorConfig = {
                type: 'message'
            }
            if(typeof options.searchCollectorConfig != 'object') options.searchCollectorConfig = {
                type: 'message'
            }

            if(!options.searchCollectorConfig.type) options.searchCollectorConfig.type = 'message';
            if(typeof options.searchCollectorConfig.type != 'string') options.searchCollectorConfig.type = 'message';

            if(!options.searchCollectorConfig.count) options.searchCollectorConfig.count = 10;
            if(typeof options.searchCollectorConfig.count != 'number') options.searchCollectorConfig.count = 10;
            if(options.searchCollectorConfig.count < 1) options.searchCollectorConfig.count = 10;
        }

        return options;
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
            try {
                const queue = await this.queue.get(guild.id);
                if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));
        
                const songInfo = await ytdl.getInfo(queue.songs[0].url);
                const streamOptions = await this.generateStreamOptions(guild);
        
                return res(ytdl(songInfo, streamOptions));
            }catch(err){
                return rej(err);
            }
        })
    }

    /**
     * Method for generating options for stream
     * @param {Guild} guild Discord Guild
     * @returns {Promise<StreamOptions>} Returns options for creating a stream
    */
    generateStreamOptions(guild) {
        return new Promise(async (res, rej) => {
            const queue = await this.queue.get(guild.id);
            if(!queue) return rej(new PlayerError(PlayerErrors.default.queueNotFound.replace('{guildID}', guild.id)));

            const encoderArgs = queue.filter ? queue.filter : null;

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
     * @returns {Array<String>} Returns an array with formatted numbers
    */
    formatNumbers(numbersArray) {
        var numberArray = [];

        for (let i = 0; i < numbersArray.length; i++) {
            if (Number(numbersArray[i]) < 10) {
                numberArray.push('0' + numbersArray[i]);
            } else {
                numberArray.push(String(numbersArray[i]));
            }
        }

        return numberArray;
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} searchResultsLimit Limit the number of results when searching for songs
 * @property {Boolean} searchCollector Custom collector status when searching for songs
 * @property {Object} searchCollectorConfig Search Collector Configuration
 * @property {'message' | 'reaction'} searchCollectorConfig.type Search Collector Type
 * @property {Number} searchCollectorConfig.count Number of reactions/maximum song index (from options.searchResultsLimit)
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