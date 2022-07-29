import { Command } from "./../types/Command";

export default {
  name: "test",
  voiceOnly: false,

  run: async (client, message, args) => {
    message.channel.send("Test command works!");
  },
} as Command;
