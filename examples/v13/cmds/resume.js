const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'resume',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send({ content: `${message.member}, join to the voice channel!`});

        client.player.resume(message.guild).then(data => {
            return message.channel.send({ content: `${message.member}, queue playback resumed!`});
        }).catch(error => {
            return message.channel.send({ content: error.message});
        })
    }
}