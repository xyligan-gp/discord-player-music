const { Client, Guild } = require('discord.js');
const ytdl = require('./modules/dpm-ytdl.js');
const MusicPlayerError = require('discord-player-music/src/MusicPlayerError.js');
const PlayerErrors = require('discord-player-music/src/PlayerErrors.js');

class Utils {
    /**
     * @param {Client} client Discord Client
     * @param {Map} queue MusicPlayer Queues Map
     */
    constructor(client, queue) {
        this.client = client;

        /**
         * MusicPlayer Queues Map
         * @type {Map}
         */
        this.queue = queue;
    }

    /**
     * Starts the song stream
     * @param {Guild} guild Discord Guild
     * @returns {void}
    */
    createStream(guild) {
        return new Promise(async (resolve, reject) => {
            try {
                let serverQueue = await this.queue.get(guild.id);
                if (!serverQueue) return reject(new MusicPlayerError(PlayerErrors.queueNotFound));

                let songInfo = await ytdl.getInfo(serverQueue.songs[0].url);

                let encoderArgs = serverQueue.filter ? ["-af", [serverQueue.filter]] : null;

                let streamOptions = {
                    opusEncoded: true,
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25,
                    encoderArgs,
                    dlChunkSize: 0
                };

                return resolve(await ytdl(songInfo, streamOptions));
            } catch (error) {
                reject(error);
            }
        })
    }

    /**
     * Method for formatting numbers
     * @param {Array<Number>} numbersArray Numbers Array
     * @returns {Array<String>} Returns an array with formatted numbers
    */
    formatNumbers(numbersArray) {
        var numberArray = [];

        for (let i = 0; i < numbersArray.length; i++) {
            if (Number(numbersArray[i]) < 10) {
                numberArray.push('0' + numbersArray[i]);
            } else {
                numberArray.push(String(numbersArray[i]));
            }
        }

        return numberArray;
    }
}

module.exports = Utils;