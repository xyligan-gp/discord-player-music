const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    player.getQueue(message.guild)
    .then(data => {
        let queueEmbed = new MessageEmbed()

        .setColor('RANDOM')
        .setTitle('Server queue songs')
        .setDescription(data.map(song => `**- ${song.title} [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]**`).join('\n'))
        .setFooter(`Requested: ${message.author.tag}`, message.author.displayAvatarURL({ dynamic: true }))
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