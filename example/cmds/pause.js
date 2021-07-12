const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'pause',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        client.player.pausePlaying(message.guild).then(status => {
            return message.reply('queue playback is paused!');
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
            if(error.message === 'Song playback has already stopped!') return message.reply('song playback has already stopped!');
        })
    }
}