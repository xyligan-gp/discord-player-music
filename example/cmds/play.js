const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'play',
    aliases: ['search'],

    /**
     * 
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        const query = args.join(' ');
        if(!query) return message.reply('enter your search request!');

        client.player.searchVideo(message.member, query, message).then(data => {
            if(!data[0].index) return;

            return message.channel.send(data.map(song => `**[${song.index}]** - **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
        })
    }
}