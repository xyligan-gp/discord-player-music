const { Client, Collection } = require('discord.js');
const { readdir } = require('fs');

/**
 * @param {Client} bot 
 * @param {Collection} commands 
*/
module.exports.on = async (bot, commands) => {
    bot.on('ready', async () => {
        readdir('./commands/', (err, files) => {
            if (err) throw err;
            let jsfiles = files.filter(f => f.split(".").pop() === "js");
            if (jsfiles.length <= 0) console.log("Commands not found!");
            console.log(`Loaded ${jsfiles.length} commands.`);
            jsfiles.forEach((f, i) => {
                let props = require(`../commands/${f}`);
                console.log(`Command ${i+1}.${f} loaded!`);
                commands.set(props.help.name, props);
            })
        })
    })
}