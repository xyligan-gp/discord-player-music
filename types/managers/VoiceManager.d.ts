// Import manager requirements
import { VoiceBasedChannel } from "discord.js";
import { VoiceConnection } from "@discordjs/voice";

declare class VoiceManager {
    /**
     * Checks if the bot is connected to a voice channel in the specified guild.
     *
     * @param guild - The guild to check.
     * 
     * @returns Returns true if the bot is connected to a voice channel in the guild, otherwise false.
     */
    public isConnected(guild: Guild): boolean;

    /**
     * Joins a voice channel.
     *
     * @param channel - The voice channel to join.
     * 
     * @returns A VoiceConnection if joining is successful, or null if not.
     */
    public join(channel: VoiceBasedChannel): VoiceConnection;

    /**
     * Leaves the voice channel.
     *
     * @param channel - The voice channel to leave.
     * 
     * @returns True if leaving the channel is successful, or false if not.
     */
    public leave(channel: VoiceBasedChannel): boolean;
}

export { VoiceManager };