const { Client, Message } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord Client
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    player.joinVoiceChannel(message.member)
    .then(data => {
        return message.reply(`bot joined in the voice channel **${data.voiceChannel.name}**`);
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'join'
}