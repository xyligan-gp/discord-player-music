const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'np',
    aliases: ['nowplaying', 'playing'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        const index = args.join(' ');

        client.player.getSongInfo(message.guild, index).then(async data => {
            const progress = await client.player.createProgressBar(message.guild);

            return message.channel.send(`Song Title: **${data.song.title}**\nSong URL: **${data.song.url}**\nSong Duration: ${data.song.duration.hours}:${data.song.duration.minutes}:${data.song.duration.seconds}\n\n${progress.bar} **[${progress.percents}]**`);
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}