import { Event } from "../types/Event";

export default {
  name: "ready",

  run(client) {
    console.log("[Client] Client is ready!");
  },
} as Event;
