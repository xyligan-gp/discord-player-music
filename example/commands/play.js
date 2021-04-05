const { Client, Message } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    if (!message.member.voice.channel) return message.reply('join in voice channel, please!');

    let searchString = args.join(' ');
    if (!searchString) return message.reply('send me request for searching!');

    player.searchVideo(message.member, searchString, message)
    .then(data => {
        if (!data[0].index) return;

        return message.channel.send(data.map(video => `**[${video.index}]** - ${video.title}`).join('\n'));
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'play'
}