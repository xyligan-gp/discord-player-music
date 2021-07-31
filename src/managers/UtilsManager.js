const { Client } = require('discord.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

class UtilsManager {
    /**
     * @param {Client} client Discord Client
     * @param {DiscordPlayerMusicOptions} options Player Options
    */
    constructor(client, options) {
        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        this.client = client;
        this.options = options;
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @type {Object}
*/

module.exports = UtilsManager;