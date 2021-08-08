const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'queueEnded',

    /**
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music/typings/PlayerData').PlayerQueue} data Event Data
    */
    run: async(client, data) => {
        return data.textChannel.send({ content: 'Server queue playing ended!'});
    }
}