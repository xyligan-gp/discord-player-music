const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'volume',
    aliases: ['vol'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.channel.send({ content: `${message.member}, join to the voice channel!`});

        const volume = args.join(' ');
        if(!volume) return message.channel.send({ content: `${message.member}, specify the volume for installation!`});

        client.player.setVolume(message.guild, volume).then(data => {
            return message.channel.send({ content: `${message.member}, volume playback changed on **${data.volume}**`});
        }).catch(error => {
            return message.channel.send({ content: error.message});
        })
    }
}