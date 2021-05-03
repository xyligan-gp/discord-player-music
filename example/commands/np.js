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
        player.getCurrentSongInfo(message.guild)
        .then(song => {
            let nowPlaying = new MessageEmbed()

            .setColor('RANDOM')
            .setTitle(':musical_note: | Info about current song!')
            .setThumbnail(song.songInfo.thumbnail)
            .setDescription(`Song Name: **${song.songInfo.title}**\nSong URL: **${song.songInfo.url}**\nSong Duration: **${song.songInfo.duration.hours}:${song.songInfo.duration.minutes}:${song.songInfo.duration.seconds}**\nSong Requested: <@${song.songInfo.requestedBy.id}>\n\n${progress}`)

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