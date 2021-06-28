const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'queue',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        client.player.getQueue(message.guild).then(data => {
            return message.channel.send(data.map((song, index) => `\`[${index + 1}]\` - **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
        })
    }
}