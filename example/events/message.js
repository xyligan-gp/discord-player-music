const { Client, Collection, MessageEmbed } = require('discord.js');

/**
 * @param {Client} bot 
 * @param {Collection} commands 
*/
module.exports.on = async (bot, commands) => {
    const prefix = '!';
    const music = new (require('discord-player-music'))(bot);

    bot.on('message', async (message) => {
        if (message.author.bot) return;
        if (message.channel.type != 'text') return;
    
        let messageArray = message.content.split(" ");
        let command = messageArray[0];
        let args = messageArray.slice(1);
        let cmd = commands.get(command.slice(prefix.length));
        if (cmd && message.content.startsWith(prefix)) cmd.run(bot, message, args);

        if(command === `${prefix}join`) {
            music.joinVoiceChannel(message.member)
            .then(data => {
                return message.reply('bot joined the voice channel!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}leave`) {
            music.leaveVoiceChannel(message.member)
            .then(data => {
                return message.reply('bot leaved from the voice channel!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}play`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            let searchString = args.join(' ');
            if(!searchString) return message.reply('send me request for searching!');

            music.searchVideo(message.member, searchString, message)
            .then(data => {
                if(!data[0].index) return;

                return message.channel.send(data.map(video => `**[${data.index}]** - ${data.title}`).join('\n'));
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}skip`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.skipSong(message.guild)
            .then(data => {
                return message.reply('Song skiped successfully!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}stop`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.stopPlaying(message.guild)
            .then(data => {
                return message.reply('Playing server queue stopped!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}queue`) {
            music.getQueue(message.guild)
            .then(data => {
                return message.channel.send(data.map(video => `${video.title}`).join('\n'));
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}np`) {
            music.createProgressBar(message.guild)
            .then(data => {
                return message.channel.send(new MessageEmbed().setColor('RANDOM').setDescription(data))
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}loop`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.setLoopSong(message.guild)
            .then(data => {
                return message.reply('repeat mode current song enabled!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}qLoop`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.setLoopSong(message.guild)
            .then(data => {
                return message.reply('repeat mode server queue enabled!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}volume`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            let volume = args[0];
            if(!volume) return message.reply('specify the playback volume!');

            music.setVolume(message.guild, volume)
            .then(data => {
                return message.reply(`volume plyback chnged on **${data.volume}**`);
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}pause`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.pausePlaying(message.guild)
            .then(data => {
                return message.reply('playing server queue paused!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}resume`) {
            if(!message.member.voice.channel) return message.reply('join in voice channel, please!');

            music.resumePlaying(message.guild)
            .then(data => {
                return message.reply('playback restored!');
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }

        if(command === `${prefix}songInfo`) {
            music.getCurrentSongInfo(message.guild)
            .then(data => {
                return message.channel.send(`Song Name: **${data.title}**\nSong URL: **${data.url}**`);
            })
            .catch(err => {
                return message.channel.send(err.stack);
            })
        }
    })

    music.on('playingSong', data => {
        console.log(data);
        data.textChannel.send(`Song is playing!\n\nSong Name: ${data.songs[0].title}\nSong Url: ${data.songs[0].url}`);
    })
    
    music.on('queueEnded', data => {
        console.log(data);
        data.textChannel.send('Queue ended!');
    })
    
    music.on('songAdded', data => {
        console.log(data);
        data.textChannel.send(`A song has been added to the queue!\n\nSong Name: ${data.title}\nSong Url: ${data.url}`);
    })
    
    music.on('playerError', error => {
        console.log(err);
    })
}