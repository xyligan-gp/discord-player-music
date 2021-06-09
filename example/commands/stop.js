const { Client, Message } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord Client
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

    player.stopPlaying(message.guild)
    .then(data => {
        return message.reply('playing server queue stopped!');
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'stop'
}