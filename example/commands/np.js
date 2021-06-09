const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = require('discord-player-music');

/**
 * @param {Client} bot Discord Client
 * @param {Message} message Discord Message
 * @param {string[]} args Command Arguments
 * @param {MusicPlayer} player Player Class
*/
module.exports.run = async (bot, message, args, player) => {
    player.createProgressBar(message.guild)
    .then(progress => {
        player.getCurrentSongInfo(message.guild)
        .then(song => {
            let nowPlaying = new MessageEmbed()

            .setColor('RANDOM')
            .setTitle(':musical_note: | Info about current song!')
            .setThumbnail(song.songInfo.thumbnail)
            .setDescription(`Song Name: **${song.songInfo.title}**\nSong URL: **${song.songInfo.url}**\nSong Duration: **${song.songInfo.duration.hours}:${song.songInfo.duration.minutes}:${song.songInfo.duration.seconds}**\nSong Requested: <@${song.songInfo.requestedBy.id}>\n\n${progress.bar} [${progress.percents}]`)

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