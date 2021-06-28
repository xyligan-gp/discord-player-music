const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'volume',
    aliases: ['vol'],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        const volume = args.join(' ');
        if(!volume) return message.reply('specify the volume for installation!');

        client.player.setVolume(message.guild, volume).then(data => {
            return message.reply(`volume playback changed on **${data.volume}**`);
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
            if(err.message === 'The specified value is not a valid! Min value: 0.1') return message.reply('incorrect value specified! Minimum: 0.1');
            if(err.message === 'The specified value is not a valid!') return message.reply('incorrect value specified!');
        })
    }
}