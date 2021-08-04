const { Client, GuildMember, Message, Permissions, version } = require('discord.js');
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
        this.methods = ['checkNode', 'checkOptions', 'checkPermissions', 'createCollector', 'formatNumbers'];

        /**
         * Utils Manager Methods Count
         * @type {Number}
        */
        this.size = this.methods.length;
    }

    /**
     * Method for checking the Node.js version installed on the server
     * @returns {Promise<void>}
     * @private
    */
    checkNode() {
        return new Promise(async (res, rej) => {
            if(!process.version.startsWith('v14')) {
                rej(new PlayerError(PlayerErrors.default.oldNodeVersion.replace('{version}', process.version)));

                setTimeout(() => {
                    process.exit();
                }, 10);
            }else{
                return;
            }
        })
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
                synchronLoop: true,
                defaultVolume: 5
            }
        }else{
            if(!options.searchResultsLimit) options.searchResultsLimit = 10;
            if(typeof options.searchResultsLimit != 'number') options.searchResultsLimit = 10;
            if(options.searchResultsLimit < 1) options.searchResultsLimit = 10;

            if(typeof options.synchronLoop != 'boolean') options.synchronLoop = true;

            if(!options.defaultVolume) options.defaultVolume = 5;
            if(typeof options.defaultVolume != 'number') options.defaultVolume;
            if(options.defaultVolume < 1) options.defaultVolume = 5;
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
 * @property {Boolean} synchronLoop Song/Queue loop auto sync status
 * @property {Number} defaultVolume Default value of playback volume
 * @type {Object}
*/

module.exports = UtilsManager;