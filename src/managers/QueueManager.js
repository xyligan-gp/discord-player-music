const { Collection, TextChannel, VoiceChannel, User } = require('discord.js');
const { AudioPlayer, VoiceConnection } = require('@discordjs/voice');

class QueueManager extends Collection {
    constructor() {
        /**
         * Guild Text Channel
         * @type {TextChannel}
        */
        this.textChannel = TextChannel;

        /**
         * Guild Voice Channel
         * @type {VoiceChannel}
        */
        this.voiceChannel = VoiceChannel;
        
        /**
         * Guild Voice Connection
         * @type {VoiceConnection}
        */
        this.connection = VoiceConnection;

        /**
         * Queue Dispatcher
         * @type {AudioPlayer}
        */
        this.dispatcher = AudioPlayer;

        /**
         * Queue Songs
         * @type {Array<PlayerSong>}
        */
        this.songs = [
            {
                index: Number(),
                searchType: String(),
                title: String(),
                url: String(),
                thumbnail: String(),
                author: String(),
                textChannel: TextChannel,
                voiceChannel: VoiceChannel,
                requestedBy: User,

                duration: {
                    hours: String(),
                    minutes: String(),
                    seconds: String()
                }
            }
        ];

        /**
         * Voice Connection Volume
         * @type {Number}
        */
        this.volume = Number();

        /**
         * Loop Object
         * @type {{ song: Boolean, queue: Boolean }}
        */
        this.loop = Object();

        /**
         * Stream Start Time
         * @type {Number}
        */
        this.startStream = Number();

        /**
         * Guild Playing Status
         * @type {Boolean}
        */
        this.playing = Boolean();

        /**
         * Queue Filters
         * @type {String}
        */
        this.filter = String();
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