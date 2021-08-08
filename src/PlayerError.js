/**
 * Player Error Handler
 * @extends {Error}
*/
class DiscordPlayerMusicError extends Error {
    /**
     * @param {String} message Error Message
    */
    constructor(message) {
        if (message instanceof Error == 'Error') {
            super(message.message);
        }

        if (typeof message == 'string') super(message);

        this.name = 'DiscordPlayerMusic Error';
    }
}

module.exports = DiscordPlayerMusicError;