// Import manager requirements
import { Guild, VoiceBasedChannel } from "discord.js";
import { getVoiceConnection, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";

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
     */
    public isConnected(guild: Guild): boolean {
        return getVoiceConnection(guild?.id) != null;
    }

    /**
     * Joins a voice channel.
     *
     * @param {(VoiceChannel|StageChannel)} channel - The voice channel to join.
     * 
     * @returns {VoiceConnection|null} A VoiceConnection if joining is successful, or null if not.
     */
    public join(channel: VoiceBasedChannel): VoiceConnection {
        const guildMember = channel?.guild?.members?.me;

        if(!guildMember?.voice?.channel) {
            const guild = channel.guild;

            const guildConnection = joinVoiceChannel(
                {
                    guildId: guild.id,
                    channelId: channel.id,

                    adapterCreator: guild.voiceAdapterCreator
                }
            )

            if(guildConnection) return guildConnection;
        }

        return null;
    }

    /**
     * Leaves the voice channel.
     *
     * @param {(VoiceChannel|StageChannel)} channel - The voice channel to leave.
     * 
     * @returns {boolean} True if leaving the channel is successful, or false if not.
     */
    public leave(channel: VoiceBasedChannel): boolean {
        const guild = channel?.guild;
        const guildMember = guild?.members?.me;

        if(guildMember?.voice?.channel?.id === channel.id) {
            const guildConnection = getVoiceConnection(guild.id);

            if(guildConnection) {
                guildConnection.destroy();

                return true;
            }
        }

        return false;
    }
}

export { VoiceManager };