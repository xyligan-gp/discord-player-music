const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'pause',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send({ content: `${message.member}, join to the voice channel!`});

        client.player.pause(message.guild).then(data => {
            return message.channel.send({ content: `${message.member}, queue playback is paused!`});
        }).catch(error => {
            return message.channel.send({ content: error.message});
        })
    }
}