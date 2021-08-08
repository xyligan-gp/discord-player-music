const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'search',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send(`${message.member}, join to the voice channel!`);

        const query = args.join(' ');
        if(!query) return message.channel.send(`${message.member}, enter your search request!`);

        client.player.searchSong(message.member, query, message.channel).then(results => {
            if(!results[0].index) return;

            message.channel.send(results.map((song, index) => `\`[${index + 1}]\` **${song.title}** __[${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]__`));
            client.player.collectors.message(message, results);
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}