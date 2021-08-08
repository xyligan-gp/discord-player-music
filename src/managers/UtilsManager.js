const { GuildMember, Permissions, version } = require('discord.js');

const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

const ms = require('../modules/ms.js');

/**
 * Manager responsible for the additional functionality of the module
*/
class UtilsManager {
    constructor() {
        /**
         * Utils Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['checkNode', 'checkOptions', 'checkPermissions', 'formatNumbers', 'getPlayerMode'];

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
            const node = Number(process.version.split('.')[0]);
            if(node < 14) {
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
                defaultVolume: 5,

                collectorsConfig: {
                    autoAddingSongs: true,
                    maxAttempts: 1,
                    time: '30s'
                }
            }
        }else{
            if(!options.searchResultsLimit) options.searchResultsLimit = 10;
            if(typeof options.searchResultsLimit != 'number') options.searchResultsLimit = 10;
            if(options.searchResultsLimit < 1) options.searchResultsLimit = 10;

            if(typeof options.synchronLoop != 'boolean') options.synchronLoop = true;

            if(!options.defaultVolume) options.defaultVolume = 5;
            if(typeof options.defaultVolume != 'number') options.defaultVolume;
            if(options.defaultVolume < 1) options.defaultVolume = 5;

            if(!options.collectorsConfig) {
                options.collectorsConfig = {
                    autoAddingSongs: true,
                    maxAttempts: 1,
                    time: '30s'
                }
            }else{
                if(typeof options.collectorsConfig.autoAddingSongs != 'boolean') options.collectorsConfig.autoAddingSongs = true;
                
                if(!options.collectorsConfig.maxAttempts) options.collectorsConfig.maxAttempts = 1;
                if(typeof options.collectorsConfig.maxAttempts != 'number') options.collectorsConfig.maxAttempts = 1;
                if(options.collectorsConfig.maxAttempts < 1) options.collectorsConfig.maxAttempts = 1;

                if(!options.collectorsConfig.time) options.collectorsConfig.time = '30s';
                if(typeof options.collectorsConfig.time != 'string') options.collectorsConfig.time = '30s';
                if(!ms(options.collectorsConfig.time)) options.collectorsConfig.time = '30s';
            }
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

    /**
     * Method for determining the mode of operation of the module
     * @returns {String} Player Mode
    */
    getPlayerMode() {
        const libraryVersion = Number(version.split('.')[0]);
        
        if(libraryVersion < 12) {
            setTimeout(() => {
                process.exit();
            }, 1000);

            throw new PlayerError(PlayerErrors.default.oldLibraryVersion.replace('{version}', version));
        }else{
            return 'v' + libraryVersion;
        }
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} [searchResultsLimit=10] Limit the number of results when searching for songs
 * @property {Boolean} [synchronLoop=true] Song/Queue loop auto sync status
 * @property {Number} [defaultVolume=5] Default value of playback volume
 * @property {Object} [collectorsConfig] CollectorsManager Configuration
 * @property {Boolean} [collectorsConfig.autoAddingSongs=true] Status of automatically adding songs to the queue from the collector
 * @property {Number} [collectorsConfig.maxAttempts=1] Maximum number of attempts to collect valid values
 * @property {String} [collectorsConfig.time=1m] Time during which the collector will collect values
 * @type {Object}
*/

module.exports = UtilsManager;