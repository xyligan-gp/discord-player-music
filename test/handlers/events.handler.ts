import { Client } from "discord.js";
import { Event } from "../types/Event";

import fs from "node:fs";
const dir = fs.readdirSync("./events");

export default async (client: Client) => {
  if (!dir.length) {
    return console.log("[Events] No events found!");
  }

  for (const file of dir) {
    const pull: Event = await (await import(`../events/${file}`)).default;
    client.events.set(pull.name, pull);

    if (pull.emitter) {
      client[pull.emitter].on(pull.name, (...args) => {
        pull.run(client, ...args);
      });
    } else {
      client.on(pull.name, (...args) => {
        pull.run(client, ...args);
      });
    }
  }

  console.log("[Events] Events loaded!");
};
