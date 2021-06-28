const { Client, Collection } = require('discord.js');
const Player = require('discord-player-music');

const Utils = require('./Utils.js');
const Config = require('../config.json');

module.exports = class MusicBot extends Client {
    constructor() {
        super({
            partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION', 'USER']
        })

        this.commands = new Collection();
        this.aliases = new Collection();
        this.events = new Collection();

        this.config = Config;
        this.player = new Player(this);
        this.utils = new Utils(this);
    }

    start() {
        this.utils.startClient();
    }
}