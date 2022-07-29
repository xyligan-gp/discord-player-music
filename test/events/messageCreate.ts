import { Message } from "discord.js";
import { Event } from "../types/Event";

export default {
  name: "messageCreate",

  run(client, message: Message) {
    if (!message.inGuild() || !message.channel.isTextBased()) return;
    if (message.author.bot) return;

    const prefix = "!!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(" ");
    const cmd = args.shift()!.toLowerCase();

    const command = client.commands.get(cmd);
    if (!command) return;

    if (command.voiceOnly === true) {
      const botVoiceChannel = message.guild.members.me!.voice.channel;
      const userVoiceChannel = message.member!.voice.channel;

      if (botVoiceChannel && userVoiceChannel) {
        if (botVoiceChannel.id !== userVoiceChannel.id) {
          return message.reply({
            content:
              "You must be in the same voice channel as the bot to use this command!",
          });
        }
      } else if (!userVoiceChannel) {
        return message.reply({
          content: "You must be in a voice channel to use this command!",
        });
      }
    }

    command.run(client, message, args);
  },
} as Event;
