const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'lyrics',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        client.player.getLyrics(message.guild).then(data => {
            return message.channel.send(`Song Title: **${data.song}**\n\n${data.lyrics}`);
        }).catch(async error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');

            const guildMap = await client.player.getGuildMap(message.guild);
            if(error.message.includes('Lyrics')) return message.reply(`lyrics for song **${guildMap.songs[0].title}** not found!`);
        })
    }
}