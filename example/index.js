const { Client, Collection } = require('discord.js');
const { readdir } = require('fs');
const client = new Client();
const config = require('./config.json');
const commands = new Collection();

readdir('./events/', (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
        const event = require(`./events/${file}`);

        event.on(client, commands);
    });
});

client.login(config.token);