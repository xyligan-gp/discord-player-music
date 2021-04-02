const { Client, Message } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    player.leaveVoiceChannel(message.member)
    .then(data => {
        return message.reply('bot leaved from the voice channel!');
    })
    .catch(err => {
        return message.channel.send(err.stack);
    })
}

module.exports.help = {
    name: 'leave'
}