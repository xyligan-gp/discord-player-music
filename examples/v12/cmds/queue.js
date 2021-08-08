const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'queue',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {String[]} args Command Arguments
    */
    run: async(client, message, args) => {
        client.player.getQueue(message.guild).then(songs => {
            return message.channel.send(songs.map((song, index) => `\`[${index + 1}]\` - **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
        }).catch(error => {
            return message.channel.send(error.message);
        })
    }
}