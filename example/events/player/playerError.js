const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'playerError',

    /**
     * 
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music').PlayerError} data Event Data
     */
    run: async(client, data) => {
        if(!data.textChannel) return console.log(data.error);

        if(data.error.message.includes('Status code: 403')) return data.textChannel.send('A playback error has occurred! Trying to run...');
        if(data.error.message.includes('Status code: 404')) return data.textChannel.send('An error has occurred in the YouTube API! Try again.');
        if(data.error.message === 'The specifie value is not valid! Min value: 1, Max value: 10') return data.textChannel.send('Invalid value entered! Minimum: 1, Maximum: 10');
        if(data.error.message === 'The specifie value is not valid!') return data.textChannel.send('Invalid value entered!');
    }
}