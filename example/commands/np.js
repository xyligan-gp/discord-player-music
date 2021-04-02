const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    player.createProgressBar(message.guild)
    .then(data => {
        return message.channel.send(new MessageEmbed().setColor('RANDOM').setDescription(data))
    })
    .catch(err => {
        return message.channel.send(err.stack);
    })
}

module.exports.help = {
    name: 'np'
}