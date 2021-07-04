////////////////////////////////////////////////////////////////
///////////// ERROR HANDLER IS discord-player-music ////////////
//////////////// Creators: xyligan & ShadowPlay ////////////////
////////////////////////////////////////////////////////////////

class MusicPlayerError extends Error {
    /**
     * Module Error Handler
     * @param {String} message Error Message
     * @returns {MusicPlayerError} Player Error
    */
    constructor(message) {
        if (message instanceof Error == 'Error') {
            super(message.message)
        }
        if (typeof message == 'string') super(message)
        this.name = 'MusicPlayerError'
    }
}

module.exports = MusicPlayerError;