import { Client } from "discord.js";

export interface Event {
  name: string;
  emitter?: string;

  run: EventRun;
}

type EventRun = (client: Client, ...args: any[]) => Promise<unknown> | unknown;
