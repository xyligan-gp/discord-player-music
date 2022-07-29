import { bold, EmbedBuilder } from "discord.js";
import { DurationObject } from "../../types/PlayerData";
import { Command } from "./../types/Command";

export default {
  name: "nowplaying",
  voiceOnly: false,

  run: async (client, message, args) => {
    const queue = await client.player.queue.get(message.guildId!);
    if ("error" in queue) {
      return message.reply({
        content: `❌ | ${bold(queue.error.message)}`,
      });
    }

    const info = await client.player.queue.trackInfo(message.guildId!);
    if ("error" in info) {
      return message.reply({
        content: `❌ | ${bold(info.error.message)}`,
      });
    }

    const trackIndex = queue.tracks.indexOf(info);
    const duration = createDurationString(info.duration);
    const embed = new EmbedBuilder();
    embed.setColor("Blurple");
    embed.setAuthor({
      name: info.requested.tag,
      iconURL: info.requested.avatarURL()!,
    });
    embed.setTitle(`Now playing: ${info.title}`);
    embed.setURL(info.url);
    embed.setDescription(
      [
        `› **Index in Queue**: ${bold(trackIndex.toString())}`,
        `› **Duration**: ${bold(duration)}`,
        `› **Requester**: ${bold(info.requested.toString())}`,
      ].join("\n")
    );
    embed.setImage(info.thumbnail);

    return message.reply({
      embeds: [embed],
    });
  },
} as Command;

function createDurationString(duration: DurationObject) {
  const str = `[${duration.hours}:${duration.minutes}:${duration.seconds}]`;
  return str;
}
