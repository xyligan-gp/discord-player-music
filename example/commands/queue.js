const { Client, Message } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    player.getQueue(message.guild)
    .then(data => {
        return message.channel.send(data.map(video => `${video.title}`).join('\n'));
    })
    .catch(err => {
        return message.channel.send(err.stack);
    })
}

module.exports.help = {
    name: 'queue'
}