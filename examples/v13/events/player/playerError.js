const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'playerError',

    /**
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music/typings/PlayerData').PlayerError} data Event Data
    */
    run: async(client, data) => {
        if(!data.textChannel) return console.log(data.error);

        if(data.error.message.includes('Status code: 403')) return data.textChannel.send({ content: 'A playback error has occurred! Trying to run...'});
        if(data.error.message.includes('Status code: 404')) return data.textChannel.send({ content: 'An error has occurred in the YouTube API! Try again.'});
    }
}