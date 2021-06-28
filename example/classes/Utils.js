const MusicBot = require('./Client.js');
const { readdirSync } = require('fs');

module.exports = class Utils {
    
    /**
     * @param {MusicBot} client Discord Client
     */
    constructor(client) {
        this.client = client;
    }

    startClient() {
        const botCommands = readdirSync('./cmds').filter(file => file.endsWith('js'));

        botCommands.map(botCommand => {
            const command = require(`../cmds/${botCommand}`);

            this.client.commands.set(command.name, command);

            if(command.aliases && command.aliases.length) command.aliases.map(alias => this.client.aliases.set(alias, command.name));
        })
        
        const botEvents = readdirSync('./events').filter(file => file.endsWith('js'));

        botEvents.map(botEvent => {
            const event = require(`../events/${botEvent}`);

            this.client.events.set(event.name, event);
            this.client.on(event.name, event.run.bind(null, this.client));
        })

        const playerEvents = readdirSync('./events/player').filter(file => file.endsWith('js'));

        playerEvents.map(playerEvent => {
            const event = require(`../events/player/${playerEvent}`);

            this.client.events.set(event.name, event);
            this.client.player.on(event.name, event.run.bind(null, this.client));
        })

        this.client.login(this.client.config.token);
    }
}