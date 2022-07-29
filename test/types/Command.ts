import { Client, Message } from "discord.js";

export interface Command {
  name: string;
  voiceOnly: boolean;

  run: CommandRun;
}

type CommandRun = (
  client: Client,
  message: Message,
  args: string[]
) => Promise<unknown> | unknown;
