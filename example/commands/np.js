const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    player.createProgressBar(message.guild)
    .then(progress => {
        message.channel.send(progress)
        player.getCurrentSongInfo(message.guild)
        .then(song => {
            let nowPlaying = new MessageEmbed()

            .setColor('RANDOM')
            .setTitle(':musical_note: | Info about current song!')
            .setThumbnail(song.thumbnail)
            .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\n\nProgress: ${progress}`)

            return message.channel.send(nowPlaying);
        })
        .catch(err => {
            return message.reply(err.message);
        })
    })
    .catch(err => {
        return message.reply(err.message);
    })
}

module.exports.help = {
    name: 'np'
}