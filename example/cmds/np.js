const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'np',
    aliases: ['nowplaying', 'playing'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        client.player.getCurrentSongInfo(message.guild).then(async data => {
            const progressBar = await client.player.createProgressBar(message.guild);

            return message.channel.send(`Song Title: **${data.songInfo.title}**\nSong URL: **${data.songInfo.url}**\nSong Duration: ${data.songInfo.duration.hours}:${data.songInfo.duration.minutes}:${data.songInfo.duration.seconds}\n\n${progressBar.bar} **[${progressBar.percents}]**`);
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
        })
    }
}