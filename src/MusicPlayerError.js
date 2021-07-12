////////////////////////////////////////////////////////////////
///////////// ERROR HANDLER IS discord-player-music ////////////
//////////////// Creators: xyligan & ShadowPlay ////////////////
////////////////////////////////////////////////////////////////

class MusicPlayerError extends Error {
    /**
     * @param {String} message Error Message
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