const { TextChannel, VoiceChannel, User } = require("discord.js");
const { VoiceConnection } = require('@discordjs/voice');

class QueueManager {
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
         * Queue Songs
         * @type {Array<Song>}
        */
        this.songs = [
            {
                index: Number() || null,
                searchType: String(),
                title: String(),
                url: String(),
                thumbnail: String(),
                author: String(),
                textChannel: TextChannel,
                voiceChannel: VoiceChannel,
                requestedBy: User,

                duration: {
                    hours: String() || Number(),
                    minutes: String() || Number(),
                    seconds: String() || Number()
                }
            }
        ];

        /**
         * Voice Connection Volume
         * @type {Number}
        */
        this.volume = Number();

        /**
         * Current Song Loop Mode Status
         * @type {Boolean}
        */
        this.loop = Boolean();

        /**
         * Guild Queue Loop Mode Status
         * @type {Boolean}
        */
        this.queueLoop = Boolean();

        /**
         * Guild Playing Status
         * @type {Boolean}
        */
        this.playing = Boolean();

        /**
         * Queue Filters
         * @type {Array<String>}
        */
        this.filter = Array(String());
    }
}

/**
 * @typedef Song
 * @property {Number | null} index Song Index
 * @property {String} searchType Song Search Type
 * @property {String} title Song Title
 * @property {String} url Song URL
 * @property {String} thumbnail Song Image
 * @property {String} author Song Channel Author
 * @property {TextChannel} textChannel Guild Text Channel
 * @property {VoiceChannel} voiceChannel Guild Voice Channel
 * @property {User} requestedBy The user who installed the song
 * @property {Object} duration Song Duration
 * @property {Number | String} duration.hours Duration in hours
 * @property {Number | String} duration.minutes Duration in minutes
 * @property {Number | String} duration.seconds Duration in seconds
 * @type {Object}
*/

module.exports = QueueManager;