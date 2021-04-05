const { Client, Message } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

    player.resumePlaying(message.guild)
    .then(data => {
        return message.reply('playback restored!');
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'resume'
}