import { Client } from "discord.js";
import { Command } from "../types/Command";

import fs from "node:fs";
const dir = fs.readdirSync("./commands");

export default async (client: Client) => {
  if (!dir.length) {
    return console.log("[Commands] No commands found!");
  }

  for (const file of dir) {
    const pull: Command = await (await import(`../commands/${file}`)).default;
    client.commands.set(pull.name, pull);
  }

  console.log("[Commands] Commands loaded!");
};
