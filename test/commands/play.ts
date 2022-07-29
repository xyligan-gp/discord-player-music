import {
  bold,
  CategoryChannelChildManager,
  EmbedBuilder,
  escapeMarkdown,
  TextChannel,
} from "discord.js";
import { Collector } from "../../src/PlayerEnums";
import { DurationObject } from "../../types/PlayerData";
import { Command } from "./../types/Command";

export default {
  name: "play",
  voiceOnly: true,

  run: async (client, message, args) => {
    const member = message.member!;
    const channel = message.channel! as TextChannel;

    const query = args.join(" ");
    if (!query) {
      return message.reply({
        content: "You must provide a query to search for!",
      });
    }

    const tracks = await client.player.search(query, member, channel);
    if ("error" in tracks) {
      return message.reply({
        content: `❌ | ${bold(tracks.error.message)}`,
      });
    }

    const embed = new EmbedBuilder();
    embed.setColor("Blurple");
    embed.setAuthor({
      name: message.author.tag,
      iconURL: message.author.avatarURL()!,
    });
    embed.setTitle(`Search results for "${query}"`);
    embed.setFooter({
      text: "Enter the number of the track you want to play!",
    });

    var str = "";
    for (const track of tracks) {
      const index = track.index!.toString();
      const title = escapeMarkdown(track.title);
      const dur = createDurationString(track.duration);

      str += `[${bold(index)}] ${bold(title)} ${bold(dur)}\n`;
    }

    embed.setDescription(str);

    const msg = await channel.send({ embeds: [embed] });
    const collector = await client.player.createCollector(
      Collector.MESSAGE,
      msg,
      tracks,
      member.id
    );

    if ("error" in collector) {
      return message.reply({
        content: `❌ | ${bold(collector.error.message)}`,
      });
    }
  },
} as Command;

function createDurationString(duration: DurationObject) {
  const str = `[${duration.hours}:${duration.minutes}:${duration.seconds}]`;
  return str;
}
