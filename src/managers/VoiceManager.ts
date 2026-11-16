import type { Player } from '../Player';
import { PlayerError, PlayerErrorCode, requireParam } from '../PlayerError';

import { VoiceBasedChannel } from 'discord.js';
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
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<VoiceManager>');

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
     * @param {VoiceBasedChannel} channel Discord Guild Voice Channel
     *
     * @example
     * const channel = message.guild?.channels.cache.get('ChannelID');
     * if(channel && channel.isVoiceBased()) await client.player.voice.join(channel);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the channel is not passed, `ALREADY_CONNECTED` if the bot is already in a voice channel of the server
     *
     * @returns {Promise<VoiceConnection>} Voice connection
     */
    public async join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        requireParam(channel, 'channel', '<VoiceManager>.join');

        const clientID = this.player.client.user?.id ?? '';
        const currentChannel = channel.guild.members.cache.get(clientID)?.voice?.channel;

        if(currentChannel) throw new PlayerError(PlayerErrorCode.ALREADY_CONNECTED, { id: clientID, channelID: currentChannel.id });

        return joinVoiceChannel({ guildId: channel.guild.id, channelId: channel.id, adapterCreator: channel.guild.voiceAdapterCreator });
    }

    /**
     * Allows the bot to leave the server's voice channel
     *
     * @param {string} guildID Discord Guild ID
     *
     * @example
     * const guildConnection = await client.player.voice.leave('GuildID');
     * return message.channel.send({ content: `Client leave from ${message.guild.channels.cache.get(guildConnection.joinConfig.channelId)} channel!` });
     *
     * @throws {PlayerError} `GUILD_NOT_FOUND` if the server is not known to the client, `USER_NOT_IN_VOICE` or `CONNECTION_FAILED` if the bot is not in a voice channel
     *
     * @returns {Promise<VoiceConnection>} The connection that was destroyed
     */
    public async leave(guildID: string): Promise<VoiceConnection> {
        requireParam(guildID, 'guildID', '<VoiceManager>.leave');

        const clientID = this.player.client.user?.id ?? '';

        const guild = this.player.client.guilds.cache.get(guildID);
        if(!guild) throw new PlayerError(PlayerErrorCode.GUILD_NOT_FOUND, { id: guildID, clientID });

        const channel = guild.members.cache.get(clientID)?.voice?.channel;
        if(!channel) throw new PlayerError(PlayerErrorCode.USER_NOT_IN_VOICE, { id: clientID });

        const connection = getVoiceConnection(guild.id);
        if(!connection) throw new PlayerError(PlayerErrorCode.CONNECTION_FAILED, { id: channel.id });

        connection.destroy();

        return connection;
    }
}
