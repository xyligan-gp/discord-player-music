const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'filter',
    aliases: [],

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
     * @param {string[]} args Command Arguments
     */
    run: async(client, message, args) => {
        if(!message.member.voice.channel) return message.reply('join to the voice channel!');

        const availableFilters = await client.player.getFilters();
        const filter = args.join(' ');

        if(!filter) return message.reply(`specify the name of the filter! Available filters: ${availableFilters.map(filter => `**${filter.name}**`).join(', ')}`);

        client.player.setFilter(message.guild, filter).then(data => {
            return message.reply(`filter **${data.filter}** successfully installed!`);
        }).catch(error => {
            if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
            if(error.message === 'Invalid filter name!') return message.reply('invalid filter name!');
            if(error.message === 'Invalid filter type!') return message.reply('invalid filter type!');
        })
    }
}