const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'shuffle',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send({ content: `${message.member}, join to the voice channel!`});

        client.player.shuffle(message.guild).then(songs => {
            return message.channel.send({ content: `${message.member}, **${songs.length}** songs have been shuffled successfully!`});
        }).catch(error => {
            return message.channel.send({ content: error.message});
        })
    }
}