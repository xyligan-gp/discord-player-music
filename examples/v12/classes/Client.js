const { Client, Collection } = require('discord.js');
const Player = require('discord-player-music');

const Utils = require('./Utils.js');

class MusicBot extends Client {
    constructor() {
        super({
            partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION', 'USER']
        })

        this.commands = new Collection();
        this.aliases = new Collection();
        this.events = new Collection();

        this.config = require('../config.json');
        this.player = new Player(this);
        this.utils = new Utils(this);
    }

    start() {
        this.utils.startClient();
    }
}

module.exports = MusicBot;