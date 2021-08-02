const { Client, Collection, GuildMember, Message, Permissions, version } = require('discord.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

class UtilsManager {
    /**
     * @param {Client} client Discord Client
    */
    constructor(client) {
        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = version.startsWith('12') ? '1' : '2';

        /**
         * Utils Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['checkOptions', 'checkPermissions', 'createCollector', 'formatNumbers'];

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

module.exports = UtilsManager;