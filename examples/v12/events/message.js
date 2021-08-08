const MusicBot = require('../classes/Client.js');
const { Message } = require('discord.js');

module.exports = {
    name: 'message',

    /**
     * @param {MusicBot} client Discord Client
     * @param {Message} message Discord Message
    */
    run: async(client, message) => {
        if(message.author.bot) return;
        if(message.channel.type != 'text') return;

        const messageArray = message.content.split(' ');
        const cmd = messageArray[0];
        const args = messageArray.slice(1);

        const command = client.commands.get(cmd.slice(client.config.prefix.length)) || client.commands.get(client.aliases.get(cmd.slice(client.config.prefix.length)));

        if(command && message.content.startsWith(client.config.prefix)) {
            command.run(client, message, args);
        }
    }
}