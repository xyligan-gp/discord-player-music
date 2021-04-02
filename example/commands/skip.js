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

    player.skipSong(message.guild)
    .then(data => {
        return message.reply('Song skipped successfully!');
    })
    .catch(err => {
        return message.channel.send(err.stack);
    })
}

module.exports.help = {
    name: 'skip'
}