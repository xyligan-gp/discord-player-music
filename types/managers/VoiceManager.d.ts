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
     * 
     * @throws If there is an error or the guild data is not found.
     */
    public isConnected(guild: Guild): boolean;

    /**
     * Joins a voice channel.
     *
     * @param channel - The voice channel to join.
     * 
     * @returns A Promise that resolves to the VoiceConnection instance.
     * 
     * @throws If there is an error joining the voice channel.
     */
    public join(channel: VoiceBasedChannel): Promise<VoiceConnection>;

    /**
     * Leaves the voice channel.
     *
     * @param channel - The voice channel to leave.
     * 
     * @returns A Promise that resolves when the voice channel is left.
     * 
     * @throws If there is an error leaving the voice channel.
     */
    public leave(channel: VoiceBasedChannel): Promise<void>;
}

export { VoiceManager };