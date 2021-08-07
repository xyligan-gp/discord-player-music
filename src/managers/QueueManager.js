const { Collection, TextChannel, VoiceChannel, User } = require('discord.js');
const { AudioPlayer, VoiceConnection } = require('@discordjs/voice');

/**
 * Manager responsible for the module queue
 * @extends {Collection}
*/
class QueueManager extends Collection {
    constructor() {
        /**
         * Guild Text Channel
         * @type {TextChannel}
        */
        this.textChannel = null;

        /**
         * Guild Voice Channel
         * @type {VoiceChannel}
        */
        this.voiceChannel = null;
        
        /**
         * Guild Voice Connection
         * @type {VoiceConnection}
        */
        this.connection = null;

        /**
         * Queue Dispatcher
         * @type {AudioPlayer}
        */
        this.dispatcher = null;

        /**
         * Queue Songs
         * @type {Array<PlayerSong>}
        */
        this.songs = [];

        /**
         * Voice Connection Volume
         * @type {Number}
        */
        this.volume = 5;

        /**
         * Loop Object
         * @type {{ song: Boolean, queue: Boolean }}
        */
        this.loop = null;

        /**
         * Stream Start Time
         * @type {Number}
        */
        this.startStream = null;

        /**
         * Guild Playing Status
         * @type {Boolean}
        */
        this.playing = true;

        /**
         * Queue Filters
         * @type {String}
        */
        this.filter = null;
    }
}

/**
 * @typedef PlayerSong
 * @property {Number} index Song Index
 * @property {String} searchType Song Search Type
 * @property {String} title Song Title
 * @property {String} url Song URL
 * @property {String} thumbnail Song Image
 * @property {String} author Song Channel Author
 * @property {TextChannel} textChannel Guild Text Channel
 * @property {VoiceChannel} voiceChannel Guild Voice Channel
 * @property {User} requestedBy The user who installed the song
 * @property {Object} duration Song Duration
 * @property {String} duration.hours Duration in hours
 * @property {String} duration.minutes Duration in minutes
 * @property {String} duration.seconds Duration in seconds
 * @type {Object}
*/

module.exports = QueueManager;