import { EmbedBuilder } from "discord.js";
import { PlayerTrack } from "../../types/PlayerData";
import { Event } from "../types/Event";

export default {
  name: "playingTrack",
  emitter: "player",

  run(client, track: PlayerTrack) {
    const embed = new EmbedBuilder();
    embed.setColor("Blurple");
    embed.setAuthor({
      name: track.requested.tag,
      iconURL: track.requested.avatarURL()!,
    });
    embed.setTitle(`Now playing: ${track.title}`);
    embed.setFooter({
      text: `Requested by: ${track.requested.tag}`,
    });

    return track.channel.text.send({
      embeds: [embed],
    });
  },
} as Event;
