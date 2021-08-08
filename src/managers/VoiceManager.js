const { Client, GuildMember, VoiceChannel } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

const PlayerError = require('../PlayerError.js');
const PlayerErrors = require('../PlayerErrors.js');

const UtilsManager = require('./UtilsManager.js');

/**
 * Manager responsible for the operation of the voice part of the module
*/
class VoiceManager {
    /**
     * @param {Client} client Discord Client
    */
    constructor(client) {
        if(!client) return new PlayerError(PlayerErrors.default.requiredClient);

        /**
         * Discord Client
         * @type {Client}
        */
        this.client = client;

        /**
         * Player Utils Manager
         * @type {UtilsManager}
        */
        this.utils = new UtilsManager();

        /**
         * Player mode of operation
         * @type {String}
        */
        this.mode = this.utils.getPlayerMode();

        /**
         * Voice Manager Methods
         * @type {Array<String>}
        */
        this.methods = ['join', 'leave'];

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

                    const clientMember = member.guild.members.cache.get(this.client.user.id);
                    if(clientMember.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.clientInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    member.voice.channel.join();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }

                case '2': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const clientMember = member.guild.members.cache.get(this.client.user.id);
                    if(clientMember.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.clientInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    joinVoiceChannel({ guildId: member.guild.id, channelId: member.voice.channel.id, adapterCreator: member.guild.voiceAdapterCreator });

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

                    const clientMember = member.guild.members.cache.get(this.client.user.id);
                    if(!clientMember.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.clientNotInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    await member.voice.channel.leave();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }

                case '2': {
                    if(!member.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.userVoiceNotFound.replace('{userID}', member.id)));

                    const clientMember = member.guild.members.cache.get(this.client.user.id);
                    if(!clientMember.voice.channel) return rej(new PlayerError(PlayerErrors.voiceManager.clientNotInVoice.replace('{clientTag}', this.client.user.tag).replace('{voiceName}', member.voice.channel.name)));

                    const connection = getVoiceConnection(member.guild.id);
                    if(connection.state.status === VoiceConnectionStatus.Destroyed) return rej(new PlayerError(PlayerErrors.voiceManager.connectionNotFound.replace('{guildID}', member.guild.id)));

                    connection.destroy();

                    return res({ status: true, voiceChannel: member.voice.channel });
                }
            }
        })
    }
}

module.exports = VoiceManager;