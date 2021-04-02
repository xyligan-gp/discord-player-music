const { Client, Collection } = require('discord.js');
const { readdir } = require('fs');
const config = require('./config.json');
const client = new Client();
const commands = new Collection();

readdir('./events/', (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
        const event = require(`./events/${file}`);

        event.on(client, commands);
    });
});

client.login(config.token);