const { Message } = require('discord.js');

const DiscordPlayerMusic = require('../Player.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

const ms = require('../modules/ms.js');

/**
 * Manager responsible for the work of custom collectors of the module
*/
class CollectorsManager {
    /**
     * @param {DiscordPlayerMusic} player Discord Player Music
    */
    constructor(player) {
        this.player = player;

        /**
         * Collectors Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['message'];

        /**
         * Collectors Manager Methods Count
         * @type {Number}
        */
        this.size = this.methods.length;
    }

    /**
     * Method for creating a message collector
     * @param {Message} msg Discord Message
     * @param {Array<PlayerSong>} resultsArray Results List
     * @returns {Promise<{ index: Number, song: PlayerSong, results: Array<PlayerSong> }>} Returns the index of a song from the list and information about it
    */
    message(msg, resultsArray) {
        return new Promise(async (res, rej) => {
            switch(this.player.mode) {
                case 'v12': {
                    const collectorFilter = message => message.author.id === msg.author.id;
                    const songIndexCollector = msg.channel.createMessageCollector(collectorFilter, { max: this.player.options.collectorsConfig.maxAttempts, time: ms(this.player.options.collectorsConfig.time) });

                    songIndexCollector.on('collect', msg => {
                        const indexValue = msg.content;
                        const resultsCount = resultsArray.length;

                        if(!isNaN(indexValue)) {
                            const index = (Number(indexValue));
                            
                            if(index < 1) {
                                songIndexCollector.stop();

                                return rej(new PlayerError(PlayerErrors.collectorsManager.smallValue.replace('{value}', '<Message>.content').replace('{minValue}', 1)));
                            }

                            if(index > resultsCount) {
                                songIndexCollector.stop();
                                
                                return rej(new PlayerError(PlayerErrors.collectorsManager.largeValue.replace('{value}', '<Message>.content').replace('{maxValue}', resultsCount)));
                            }
                            const song = resultsArray[index - 1];

                            switch(this.player.options.collectorsConfig.autoAddingSongs) {
                                case true: {
                                    songIndexCollector.stop();
                                    this.player.addSong(index, msg.member, resultsArray);

                                    return res({ index: index, song: song, results: resultsArray });
                                }

                                case false: {
                                    songIndexCollector.stop();

                                    return res({ index: index, song: song, results: resultsArray });
                                }
                            }
                        }else{
                            if(this.player.options.collectorsConfig.maxAttempts < 2) rej(new PlayerError(PlayerErrors.default.invalidValue.replace('{value}', '<Message>.content').replace('{type}', 'number')));
                            else rej(new PlayerError(PlayerErrors.default.invalidValue.replace('{value}', '<Message>.content').replace('{type}', 'number')));
                        }
                    })

                    break;
                }

                case 'v13': {
                    const collectorFilter = message => message.author.id === msg.author.id;
                    const songIndexCollector = msg.channel.createMessageCollector({ filter: collectorFilter, maxProcessed: this.player.options.collectorsConfig.maxAttempts + 1, time: ms(this.player.options.collectorsConfig.time) });

                    songIndexCollector.on('collect', msg => {
                        const indexValue = msg.content;
                        const resultsCount = resultsArray.length;

                        if(!isNaN(indexValue)) {
                            const index = (Number(indexValue));
                            
                            if(index < 1) {
                                songIndexCollector.stop();

                                return rej(new PlayerError(PlayerErrors.collectorsManager.smallValue.replace('{value}', '<Message>.content').replace('{minValue}', 1)));
                            }

                            if(index > resultsCount) {
                                songIndexCollector.stop();
                                
                                return rej(new PlayerError(PlayerErrors.collectorsManager.largeValue.replace('{value}', '<Message>.content').replace('{maxValue}', resultsCount)));
                            }
                            const song = resultsArray[index - 1];

                            switch(this.player.options.collectorsConfig.autoAddingSongs) {
                                case true: {
                                    songIndexCollector.stop();
                                    this.player.addSong(index, msg.member, resultsArray);

                                    return res({ index: index, song: song, results: resultsArray });
                                }

                                case false: {
                                    songIndexCollector.stop();

                                    return res({ index: index, song: song, results: resultsArray });
                                }
                            }
                        }else{
                            if(this.player.options.collectorsConfig.maxAttempts < 2) rej(new PlayerError(PlayerErrors.default.invalidValue.replace('{value}', '<Message>.content').replace('{type}', 'number')));
                            else rej(new PlayerError(PlayerErrors.default.invalidValue.replace('{value}', '<Message>.content').replace('{type}', 'number')));
                        }
                    })

                    break;
                }
            }
        })
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @property {Number} [searchResultsLimit=10] Limit the number of results when searching for songs
 * @property {Boolean} [synchronLoop=true] Song/Queue loop auto sync status
 * @property {Number} [defaultVolume=5] Default value of playback volume
 * @property {Object} [collectorsConfig] CollectorsManager Configuration
 * @property {Boolean} [collectorsConfig.autoAddingSongs=true] Status of automatically adding songs to the queue from the collector
 * @property {Number} [collectorsConfig.maxAttempts=1] Maximum number of attempts to collect valid values
 * @property {String} [collectorsConfig.time=1m] Time during which the collector will collect values
 * @type {Object}
*/

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

module.exports = CollectorsManager;