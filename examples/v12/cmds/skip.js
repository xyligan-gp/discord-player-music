const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'skip',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send(`${message.member}, join to the voice channel!`);

        client.player.skip(message.guild).then(data => {
            return message.channel.send(`${message.member}, song successfully skiped!`);
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}