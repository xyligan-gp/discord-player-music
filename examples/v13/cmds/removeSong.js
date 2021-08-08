const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'removeSong',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        const value = args.join(' ');
        if(!value) return message.channel.send({ content: `${message.member}, enter song ID/title!`});

        client.player.removeSong(message.guild, value).then(data => {
            return message.channel.send({ content: `${message.member}, song successfully removed!`});
        }).catch(error => {
            return message.channel.send({ content: error.message});
        })
    }
}