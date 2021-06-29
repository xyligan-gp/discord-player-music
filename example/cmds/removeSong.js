const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'removeSong',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        const song_Name_ID = args.join(' ');
        if(!song_Name_ID) return message.reply('enter song ID/title!');

        client.player.removeSong(message.guild, song_Name_ID).then(data => {
            return message.reply('song successfully removed!');
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
        })
    }
}