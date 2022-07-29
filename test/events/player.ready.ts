import { Event } from "../types/Event";

export default {
  name: "ready",
  emitter: "player",

  run(client, player) {
    console.log("[Player] Player is ready!");
  },
} as Event;
