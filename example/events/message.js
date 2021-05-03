const { Client, Collection, MessageEmbed } = require('discord.js');
const config = require('../config.json');
const prefix = config.prefix;

/**
 * @param {Client} bot 
 * @param {Collection} commands 
*/
module.exports.on = async (bot, commands) => {
    const player = new (require('discord-player-music'))(bot);

    bot.on('message', message => {
        if (message.author.bot) return;
        if (message.channel.type != 'text') return;
    
        let messageArray = message.content.split(" ");
        let command = messageArray[0];
        let args = messageArray.slice(1);
        let cmd = commands.get(command.slice(prefix.length));
        if (cmd && message.content.startsWith(prefix)) cmd.run(bot, message, args, player);
    })

    player.on('playingSong', data => {
        let song = data.songs[0];

        let nowPlaying = new MessageEmbed()

        .setColor('RANDOM')
        .setTitle(':musical_note: | Song is playing!')
        .setThumbnail(song.thumbnail)
        .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}>`)

        data.textChannel.send(nowPlaying);
    })

    player.on('songAdded', song => {
        let nowPlaying = new MessageEmbed()

        .setColor('RANDOM')
        .setTitle(':musical_note: | A song has been added to the queue!')
        .setThumbnail(song.thumbnail)
        .setDescription(`Song Name: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**\nSong Requested: <@${song.requestedBy.id}> [${song.requestedBy.user.tag}]`)

        song.textChannel.send(nowPlaying);
    })

    player.on('queueEnded', data => {
        data.textChannel.send(new MessageEmbed().setColor('RANDOM').setDescription(`Server queue ended!`));
    })

    player.on('playerError', err => {
        console.log(err);
    })
}