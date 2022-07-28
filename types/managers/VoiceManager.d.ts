import { Player } from "../Player";
import { ErrorData } from "../PlayerData";

import { VoiceChannel } from "discord.js";
import { VoiceConnection } from "@discordjs/voice";

export declare class VoiceManager {
  constructor(player: Player);

  /**
   * Player Class
   */
  private player: Player;

  /**
   * Allows the bot to join a voice channel on the server
   *
   * @param channel Discord Guild Voice Channel ID
   *
   * @returns Voice connection or error object
   */
  public join(channel: VoiceChannel): Promise<VoiceConnection | ErrorData>;

  /**
   * Allows the bot to leave the server's voice channel
   *
   * @param guildID Discord Guild ID
   *
   * @returns Connection or error object
   */
  public leave(guildID: string): Promise<VoiceConnection | ErrorData>;
}
