const { Client, Collection } = require('discord.js');
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
        data.textChannel.send(`Song is playing!\n\nSong Name: ${data.songs[0].title}\nSong Url: ${data.songs[0].url}`);
    })

    player.on('queueEnded', data => {
        data.textChannel.send('Queue ended!');
    })

    player.on('songAdded', data => {
        data.textChannel.send(`A song has been added to the queue!\n\nSong Name: ${data.title}\nSong Url: ${data.url}`);
    })

    player.on('playerError', error => {
        console.log(err);
    })
}