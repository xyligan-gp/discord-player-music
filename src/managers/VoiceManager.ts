import { Player } from '../Player';
import { PlayerError } from '../PlayerError';

import errors from '../data/errors.json';

import { ErrorData } from '../../types/PlayerData';

import { VoiceChannel } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel, VoiceConnection } from '@discordjs/voice';

/**
 * Class that controls Player Voice Manager
 * 
 * @class
 * @classdesc Player Voice Manager Class
 */
export class VoiceManager {
    private player: Player;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     */
    constructor(player: Player) {
        if(!player) throw new PlayerError(errors.default.requireParam.replace('{param}', 'player').replace('{data}', '<VoiceManager>'));
        
        /**
         * Player Class
         * 
         * @type {Player}
         * @private
         */
        this.player = player;
    }

    /**
     * Allows the bot to join a voice channel on the server
     * 
     * @param {VoiceChannel} channel Discord Guild Voice Channel ID
     * 
     * @example
     * const channel = message.guild?.channels.cache.get('ChannelID');
     * if(channel && channel.isVoiceBased()) await client.player.voice.join(channel);
     * 
     * @returns {Promise<VoiceConnection | ErrorData>} Voice connection or error object
     */
    public join(channel: VoiceChannel): Promise<VoiceConnection | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!channel) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'channel').replace('{data}', '<VoiceManager>.join'));

            const guildClientMember = channel.guild.members.cache.get(this.player.client.user.id);
            if(guildClientMember?.voice?.channel) return res({ error: { code: 404, message: this.player.errors.voice.alreadyConnected.replace('{id}', this.player.client.user.id).replace('{channelID}', guildClientMember.voice.channel.id) } });

            const connection = joinVoiceChannel({ guildId: channel.guild.id, channelId: channel.id, adapterCreator: channel.guild.voiceAdapterCreator });

            if(connection) return res(connection);
            else return res({ error: { code: 503, message: this.player.errors.voice.failConnect.replace('{id}', guildClientMember.voice.channel.id) } });
        })
    }

    /**
     * Allows the bot to leave the server's voice channel
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const guildConnection = await client.player.voice.leave('GuildID');
     * if(guildConnection?.joinConfig) return message.channel.send({ content: `Client leave from ${message.guild.channels.cache.get(guildConnection.joinConfig.channelId)} channel!` });
     * 
     * @returns {Promise<VoiceConnection | ErrorData>} Connection or error object
     */
    public leave(guildID: string): Promise<VoiceConnection | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<VoiceManager>.leave'));

            const guild = this.player.client.guilds.cache.get(guildID);
            if(!guild) return res({ error: { code: 404, message: this.player.errors.other.unknownGuild.replace('{id}', guildID).replace('{clientID}', this.player.client.user.id) } });

            const guildClientMember = guild.members.cache.get(this.player.client.user.id);
            if(!guildClientMember?.voice?.channel) return res({ error: { code: 404, message: this.player.errors.voice.notConnected.replace('{id}', this.player.client.user.id) } });

            const connection = getVoiceConnection(guild.id);
            if(!connection) return res({ error: { code: 404, message: this.player.errors.voice.failConnect.replace('{id}', guildClientMember.voice.channel.id) } });

            connection.destroy();

            return res(connection);
        })
    }
}