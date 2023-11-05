// Import manager requirements
import { Guild, VoiceBasedChannel } from "discord.js";
import { getVoiceConnection, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";

// Import player error class
import { PlayerError } from "../Error";

/**
 * Player Voice Manager Class
 * 
 * @class
 * @classdesc Class representing a Player Voice Manager.
 */
class VoiceManager {
    /**
     * Checks if the bot is connected to a voice channel in the specified guild.
     *
     * @param {Guild} guild - The guild to check.
     * 
     * @returns {boolean} Returns true if the bot is connected to a voice channel in the guild, otherwise false.
     * 
     * @throws {PlayerError} If there is an error or the guild data is not found.
     */
    public isConnected(guild: Guild): boolean {
        if(!guild) throw new PlayerError("Couldn't find the guild data!");

        return getVoiceConnection(guild.id) != null;
    }

    /**
     * Joins a voice channel.
     *
     * @param {(VoiceChannel|StageChannel)} channel - The voice channel to join.
     * 
     * @returns {Promise<VoiceConnection>} A Promise that resolves to the VoiceConnection instance.
     * 
     * @throws {PlayerError} If there is an error joining the voice channel.
     */
    public join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        return new Promise(async (res, rej) => {
            if(!channel) return rej(new PlayerError("Couldn't find the voice channel data!"));

            const guildClient = channel.guild.members.me;
            if(guildClient?.voice?.channel) return rej(new PlayerError(`The client is already in the voice channel with ID ${guildClient.voice.channel.id}!`));

            const guildConnection = joinVoiceChannel(
                {
                    guildId: channel.guild.id,
                    channelId: channel.id,

                    adapterCreator: channel.guild.voiceAdapterCreator
                }
            )

            if(!guildConnection) return rej(new PlayerError(`Failed to join channel with ID ${channel.id}!`));
            
            return res(guildConnection);
        })
    }

    /**
     * Leaves the voice channel.
     *
     * @param {(VoiceChannel|StageChannel)} channel - The voice channel to leave.
     * 
     * @returns {Promise<void>} A Promise that resolves when the voice channel is left.
     * 
     * @throws {PlayerError} If there is an error leaving the voice channel.
     */
    public leave(channel: VoiceBasedChannel): Promise<void> {
        return new Promise(async (res, rej) => {
            if(!channel) return rej(new PlayerError("Couldn't find the voice channel data!"));

            const guildClient = channel.guild.members.me;
            if(!guildClient?.voice?.channel) return rej(new PlayerError(`Could not find a client in the voice channel with ID ${channel.id}!`));

            const guildConnection = getVoiceConnection(channel.guild.id);
            if(!guildConnection) return rej(new PlayerError(`Failed to disconnect the client from the voice channel with ID ${channel.id}!`));

            guildConnection.destroy();

            return res();
        })
    }
}

export { VoiceManager };