const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'loop',
    aliases: ['repeat'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        client.player.setLoopSong(message.guild).then(data => {
            return message.reply(`**${data.status ? 'Enabled' : 'Disabled'}** repeat song **${data.song.title}**`);
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
        })
    }
}