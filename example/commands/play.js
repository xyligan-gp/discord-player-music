const { Client, Message } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord Client
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    if (!message.member.voice.channel) return message.reply('join in voice channel, please!');

    let searchString = args.join(' ');
    if (!searchString) return message.reply('send me request for searching!');

    player.searchVideo(message.member, searchString, message)
    .then(data => {
        if (!data[0].index) return;

        return message.channel.send(data.map(song => `**[${song.index}]** - __${song.title}__ **__[${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]__**`).join('\n'));
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'play'
}