const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'join',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        client.player.joinVoiceChannel(message.member).then(data => {
            return message.reply(`the bot joined the **${data.voiceChannel.name}** channel!`);
        }).catch(error => {
            if(error.message === 'The client is already in the VoiceChannel!') return message.reply('the bot is already in the voice channel!');
        })
    }
}