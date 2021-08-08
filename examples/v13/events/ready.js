const MusicBot = require('../classes/Client.js');

module.exports = {
    name: 'ready',

    /**
     * @param {MusicBot} client Discord Client
    */
    run: async(client) => {
        return console.log(`${client.user.tag} ready!`);
    }
}