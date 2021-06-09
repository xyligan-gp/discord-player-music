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

    player.getCurrentSongInfo(message.guild)
    .then(data => {
        return message.channel.send(`Song Name: **${data.songInfo.title}**\nSong URL: **${data.songInfo.url}**\nSong Duration: **${data.songInfo.duration.hours}:${data.songInfo.duration.minutes}:${data.songInfo.duration.seconds}**`);
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'songInfo'
}