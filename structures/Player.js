const { TextChannel, VoiceChannel, VoiceConnection, User } = require('discord.js');

module.exports = {
    Song: {
        /**
         * Song index in searched tracks
         */
        index: Number(),

        /**
         * Search type
         */
        searchType: String(),

        /**
         * Song Title
         */
        title: String(),

        /**
         * Song URL
         */
        url: String(),

        /**
         * Song Thumbnail URL
         */
        thumbnail: String(),

        /**
         * Song Author
         */
        author: String(),

        /**
         * Discord TextChannel
         */
        textChannel: TextChannel,

        /**
         * Discord VoiceChannel
         */
        voiceChannel: VoiceChannel,

        /**
         * Song requested
         */
        requestedBy: User,

        /**
         * Song Duration
         */
        duration: {
            hours: String() || Number(),
            minutes: String() || Number(),
            seconds: String() || Number()
        }

    },

    GuildMap: {
        /**
         * Discord TextChannel
         */
        textChannel: TextChannel,

        /**
         * Discord VoiceChannel
         */
        voiceChannel: VoiceChannel,

        /**
         * Discord VoiceConnection
         */
        connection: VoiceConnection,

        /**
         * Guild Songs Array
         */
        songs: [{
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
                hours: String() || Number(),
                minutes: String() || Number(),
                seconds: String() || Number()
            }
        }],

        /**
         * Playback volume
         */
        volume: Number(),

        /**
         * Loop Song Status
         */
        loop: Boolean(),

        /**
         * Loop Queue Status
         */
        queueLoop: Boolean(),

        /**
         * Playing Status
         */
        playing: Boolean(),

        /**
         * Playback filter
         */
        filter: String()
    },

    Filters: [
        { name: '3D', value: 'apulsator=hz=0.125' },
        { name: 'bassboost', value: 'bass=g=10,dynaudnorm=f=150:g=15' },
        { name: 'echo', value: 'aecho=0.8:0.9:1000:0.3' },
        { name: 'fadein', value: 'afade=t=in:ss=0:d=10' },
        { name: 'flanger', value: 'flanger' },
        { name: 'gate', value: 'agate' },
        { name: 'haas', value: 'haas' },
        { name: 'karaoke', value: 'stereotools=mlev=0.1' },
        { name: 'nightcore', value: 'asetrate=48000*1.25,aresample=48000,bass=g=5' },
        { name: 'reverse', value: 'areverse' },
        { name: 'vaporwave', value: 'asetrate=48000*0.8,aresample=48000,atempo=1.1' },
        { name: 'mcompand', value: 'mcompand' },
        { name: 'phaser', value: 'aphaser' },
        { name: 'tremolo', value: 'tremolo' },
        { name: 'surround', value: 'surround' },
        { name: 'earwax', value: 'earwax' },
        { name: 'clear', value: null }
    ]
}