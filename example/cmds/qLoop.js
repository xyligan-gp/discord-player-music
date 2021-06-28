const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'qLoop',
    aliases: ['qRepeat'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        client.player.setLoopQueue(message.guild).then(data => {
            return message.reply(`**${data.songs.length}** songs repeat **${data.status ? 'Enabled' : 'Disabled'}**`);
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
        })
    }
}