import { Client, GuildMember, VoiceChannel } from 'discord.js';

import DiscordPlayerMusicOptions from './DiscordPlayerMusicOptions';

declare class VoiceManager {
    constructor(client: Client, options: DiscordPlayerMusicOptions);

    public client: Client;
    public options: DiscordPlayerMusicOptions;
    public mode: string;
    public methods: Array<string>;
    public size: number;

    /**
     * Method for inviting a bot to a voice channel
     * @param member Guild Member
     * @returns Returns the status of the action and information about the voice channel
    */
    join(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;

    /**
     * Method to exit the bot from the voice channel
     * @param member Guild Member
     * @returns Returns the status of the action and information about the voice channel
    */
    leave(member: GuildMember): Promise<{ status: boolean, voiceChannel: VoiceChannel }>;
}

export = VoiceManager;