console.clear();

import { Client, Collection, IntentsBitField, Partials } from "discord.js";
import { Player } from "../src/Player";
import { token } from "./config.json";

import { Command } from "./types/Command";
import { Event } from "./types/Event";

import CommandHandler from "./handlers/commands.handler";
import EventHandler from "./handlers/events.handler";

const client = new Client({
  rest: {
    offset: 0,
  },

  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildEmojisAndStickers,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  partials: [Partials.Reaction],
});

client.commands = new Collection();
client.events = new Collection();
client.player = new Player(client, {
  autoAddingTracks: true,
  synchronLoop: true,
  searchResultsLimit: 10,
  collectorsConfig: {
    message: {
      attempts: 1,
      time: "15s",
    },
  },
});

CommandHandler(client);
EventHandler(client);

client.login(token);

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
    events: Collection<string, Event>;

    player: Player;
  }
}
