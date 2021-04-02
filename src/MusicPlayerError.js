module.exports = class MusicPlayerError extends Error {
    constructor(message) {
        if (message instanceof Error == 'Error') {
            super(message.message)
        }
        if (typeof message == 'string') super(message)
        this.name = 'MusicPlayerError'
    }
}