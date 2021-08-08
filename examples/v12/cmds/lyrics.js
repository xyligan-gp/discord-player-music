const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'lyrics',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        const query = args.join(' ');

        client.player.getLyrics(message.guild, query).then(data => {
            return message.channel.send(`Song Title: **${typeof data.song != 'object' ? data.song : data.song.title}**\n\n${data.lyrics}`);
        }).catch(async error => {
            return message.channel.send(error.message);
        })
    }
}