const { Client, GuildMember, version, VoiceChannel } = require('discord.js');
const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');
const Voice = require('@discordjs/voice');

class VoiceManager {
    /**
     * @param {Client} client Discord Client
     * @param {DiscordPlayerMusicOptions} options Player Options
    */
    constructor(client, options) {
        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Options
         * @type {DiscordPlayerMusicOptions}
        */
        this.options = options;

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = version.includes('12') ? '1' : '2';

        /**
         * Voice Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['join'];

        /**
         * Voice Manager Methods Count
         * @type {Number}
        */
        this.size = this.methods.length;
    }

    /**
     * Method for inviting a bot to a voice channel
     * @param {GuildMember} member Guild Member
     * @returns {Promise<{ status: Boolean, voiceChannel: VoiceChannel }>} Returns the status of the action and information about the voice channel
    */
    join(member) {
        return new Promise(async (res, rej) => {
            switch(this.mode) {
                case '1': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const voiceUsersCollection = member.voice.channel.members;
                    if(voiceUsersCollection.find(member => member.id === this.client.user.id)) return rej(new PlayerError(PlayerErrors.voiceManager.clientInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    member.voice.channel.join();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }

                case '2': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const voiceUsersCollection = member.voice.channel.members;
                    if(voiceUsersCollection.find(member => member.id === this.client.user.id)) return rej(new PlayerError(PlayerErrors.voiceManager.clientInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    Voice.joinVoiceChannel({ guildId: member.guild.id, channelId: member.voice.channel.id, adapterCreator: member.guild.voiceAdapterCreator });

                    return res({ status: true, voiceChannel: member.voice.channel });
                }
            }
        })
    }

    /**
     * Method to exit the bot from the voice channel
     * @param {GuildMember} member Guild Member
     * @returns {Promise<{ status: Boolean, voiceChannel: VoiceChannel }>} Returns the status of the action and information about the voice channel
    */
    leave(member) {
        return new Promise(async (res, rej) => {
            switch(this.mode) {
                case '1': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const voiceUsersCollection = member.voice.channel.members;
                    if(!voiceUsersCollection.find(member => member.id === this.client.user.id)) return rej(new PlayerError(PlayerErrors.voiceManager.clientNotInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    await member.voice.channel.leave();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }

                case '2': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const voiceUsersCollection = member.voice.channel.members;
                    if(!voiceUsersCollection.find(member => member.id === this.client.user.id)) return rej(new PlayerError(PlayerErrors.voiceManager.clientNotInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    const connection = Voice.getVoiceConnection(member.guild.id);
                    connection.destroy();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }
            }
        })
    }
}

/**
 * @typedef DiscordPlayerMusicOptions
 * @type {Object}
*/

module.exports = VoiceManager;