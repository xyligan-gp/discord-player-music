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

    let filter = args.join(' ');
    if (!filter) return message.reply('send me filter name, please!');

    player.setFilter(message.guild, filter)
    .then(data => {
        return message.reply(`filter **${filter}** successfully installed!`);
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'filter'
}