const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'play',
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
            client.player.addSong(1, message.member, results);
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}