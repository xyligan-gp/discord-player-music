const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'filter',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send(`${message.member}, join to the voice channel!`);

        const filter = args.join(' ');

        client.player.setFilter(message.guild, filter).then(data => {
            return message.channel.send(`${message.member}, filter **${data.filter.name}** successfully installed!`);
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}