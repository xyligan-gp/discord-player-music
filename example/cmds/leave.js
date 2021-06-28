const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'leave',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        client.player.leaveVoiceChannel(message.member).then(data => {
            return message.reply(`the bot left the voice channel **${data.voiceChannel.name}**`);
        }).catch(error => {
            if(error.message === 'The client is not already in the VoiceChannel!') return message.reply('bot not found in voice channel!');
        })
    }
}