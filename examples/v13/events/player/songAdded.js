const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'songAdded',

    /**
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music/typings/PlayerData').PlayerSong} song Event Data
    */
    run: async(client, song) => {
        return song.textChannel.send({ content: `New Song Added To Queue!\n\nSong Title: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`});
    }
}