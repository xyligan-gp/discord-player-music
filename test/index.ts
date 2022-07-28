import { Client, IntentsBitField } from "discord.js";
import { Player } from "../src/Player";
import { token } from "./config.json";

const client = new Client({
  intents: [
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

const player = new Player(client);

client.once("ready", () => {
  console.log("[Client] Client is ready!");
});

client.on("messageCreate", async (message) => {});

client.login(token);
