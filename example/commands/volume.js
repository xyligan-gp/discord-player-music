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

    let volume = args[0];
    if(!volume) return message.reply('specify the playback volume!');

    player.setVolume(message.guild, volume)
    .then(data => {
        return message.reply(`volume playback changed on **${data.volume}**`);
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'volume'
}