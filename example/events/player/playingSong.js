const MusicBot = require('../../classes/Client.js');

module.exports = {
    name: 'playingSong',

    /**
     * @param {MusicBot} client Discord Client
     * @param {import('discord-player-music').GuildMap} data Event Data
     */
    run: async(client, data) => {
        const song = data.songs[0];

        return data.textChannel.send(`Song Title: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`);
    }
}