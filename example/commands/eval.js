const { Client, Message, MessageEmbed } = require('discord.js');
const MusicPlayer = new (require('discord-player-music'))(new Client());

/**
 * @param {Client} bot 
 * @param {Message} message 
 * @param {string[]} args 
 * @param {MusicPlayer} player 
*/
module.exports.run = async (bot, message, args, player) => {
    const clean = text => {
        if (typeof (text) === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
        else return text;
    }

    try {
        const code = args.join(' ');
        let evaled = eval(code);

        if (typeof evaled !== "string")
            evaled = require("util").inspect(evaled);

        if (evaled == 'Promise { <pending> }') return;
        if (evaled == 'undefined') return;
        message.channel.send(clean(evaled), { code: "JS" }).catch(err => {
            return message.channel.send(new MessageEmbed().setColor('RANDOM').setDescription(`При выполнении кода произошла ошибка: \`\`\`xl\n${clean(err)}\n\`\`\``));
        })
    } catch (err) {
        return message.channel.send(MessageEmbed().setColor('RANDOM').setDescription(`При выполнении кода произошла ошибка: \`\`\`xl\n${clean(err)}\n\`\`\``));
    }
}

module.exports.help = {
    name: 'eval'
}