const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord Client
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    player.getQueue(message.guild)
    .then(data => {
        let queueEmbed = new MessageEmbed()

        .setColor('RANDOM')
        .setTitle('Server queue songs')
        .setDescription(data.map(song => `**- ${song.title} [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]**`).join('\n'))
        .setTimestamp();

        return message.channel.send(queueEmbed);
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'queue'
}