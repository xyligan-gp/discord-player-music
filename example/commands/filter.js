const { Client, Message } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord CLient
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    if (!message.member.voice.channel) return message.reply('join in voice channel, please!');

    let filter = args.join(' ');
    if (!filter) return message.reply(`select filter: ${(await player.getFilters()).map(filter => `**${filter.name}**`).join(', ')}`);

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