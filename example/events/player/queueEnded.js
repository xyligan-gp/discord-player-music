const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'queueEnded',

    /**
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music').GuildMap} data Event Data
     */
    run: async(client, data) => {
        return data.textChannel.send('Server queue playing ended!');
    }
}