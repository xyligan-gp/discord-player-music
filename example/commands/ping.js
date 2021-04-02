const { Client, Message } = require('discord.js');

/**
 * 
 * @param {Client} bot 
 * @param {Message} message 
 * @param {String[]} args 
*/
module.exports.run = async (bot, message, args) => {
    return message.channel.send(`Bot Ping: **${bot.ws.ping} ms.**`);
}

module.exports.help = {
    name: 'ping'
}