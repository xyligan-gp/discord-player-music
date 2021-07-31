const { Client, Collection, version } = require('discord.js');
const Emitter = require('./Emitter.js');
const PlayerError = require('./PlayerError.js');
const PlayerErrors = require('./PlayerErrors.js');

const QueueManager = require('./managers/QueueManager.js');
const UtilsManager = require('./managers/UtilsManager.js');
const VoiceManager = require('./managers/VoiceManager.js');

class DiscordPlayerMusic extends Emitter {
    /**
     * @param {Client} client Discord CLient
     * @param {DiscordPlayerMusicOptions} options Player Options
    */
    constructor(client, options) {
        super();

        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Status
         * @type {Boolean}
        */
        this.ready = false;
        
        /**
         * Player Options
         * @type {PlayerOptions}
        */
        this.options = options;

        /**
         * Player Documentation Link
         * @type {String}
        */
        this.docs = require('../package.json').homepage;
        
        /**
         * Player Version
         * @type {String}
        */
        this.version = require('../package.json').version;

        /**
         * Player Developer
        */
        this.author = require('../package.json').author;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = version.includes('12') ? '1' : '2';

        /**
         * Player Queue Manager
         * @type {Collection<String, QueueManager>}
        */
        this.queue = new Collection();

        /**
         * Player Utils Manager
         * @type {UtilsManager}
        */
        this.utils = new UtilsManager(this.client, this.options);

        /**
         * Player Voice Manager
         * @type {VoiceManager}
        */
        this.voice = new VoiceManager(this.client, this.options);
    }

    /**
     * Method for initializing the module
     * @returns {void}
    */
    init() {
        this.ready = true;
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @type {Object}
*/

module.exports = DiscordPlayerMusic;