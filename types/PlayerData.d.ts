import { Guild, TextChannel, VoiceChannel, User } from "discord.js";
import { AudioPlayer, VoiceConnection } from "@discordjs/voice";

import { GuildQueueState } from "./Player";

interface PlayerFilters {
  "3D": string;
  bassboost: string;
  echo: string;
  fadein: string;
  flanger: string;
  gate: string;
  haas: string;
  karaoke: string;
  nightcore: string;
  reverse: string;
  vaporwave: string;
  mcompand: string;
  phaser: string;
  tremolo: string;
  surround: string;
  slowed: string;
  earwax: string;
  underwater: string;
  clear: null;
}

export type Filter = keyof PlayerFilters;

export interface PlayerQueue {
  channel: ChannelTypes;

  dispatcher: AudioPlayer;
  tracks: PlayerTrack[];
  connection: VoiceConnection;

  loop: LoopModes;

  volume: number;
  startStream: number;
  state: GuildQueueState;
  filter: PlayerFilter;
}

export interface PlayerTrack {
  index?: number;
  searchType: string;
  title: string;
  url: string;
  thumbnail: string;

  author: AuthorObject;
  channel: ChannelTypes;

  guild: Guild;
  requested: User;

  duration: DurationObject;
}

export interface PlayerFilter {
  name: string | null;
  value: string | null;
}

export interface PlayerError {
  channel?: ChannelTypes;

  requested: User;
  method: string;
  error: Error;
}

export interface LyricsData {
  query: string;
  result: string;
}

export interface PlaylistTrack {
  url: string;
  title: string;
}

export interface CreatePlaylistData {
  title?: string;
  author: string;
  track: PlaylistTrack;
}

export interface AddPlaylistData {
  id?: string;
  track: PlaylistTrack;
}

export interface GuildPlaylist {
  id: string;
  title: string;
  author: string;
  created: number;
  updated: number;
  duration: number;
  lastPlaying: number;
  tracks: PlaylistTrack[];
}

export interface ErrorData {
  error: {
    code: number;
    message: string;
  };
}

export interface SkipData {
  current: PlayerTrack;
  next: PlayerTrack;
}

export interface DefaultData {
  status: boolean;
}

export interface CollectorData {
  index: number;
  track: PlayerTrack;
  data: PlayerTrack[];
}

export interface ProgressData {
  bar: string;
  percents: string;
}

export interface StreamData {
  loop: LoopModes;

  filter: PlayerFilter;
  state: GuildQueueState;
  volume: number;

  streamTime: StreamObject;
}

export interface LoopModes {
  track: boolean;
  queue: boolean;
}

export interface RemoveTrackData {
  deleted: PlayerTrack;
  tracks: PlayerTrack[];
}

export interface PlayerError {
  channel?: ChannelTypes;

  requested: User;
  method: string;
  error: Error;
}

export interface StreamOptions {
  seek?: number;
  filter?: string;
}

interface ChannelTypes {
  text: TextChannel;
  voice: VoiceChannel;
}

interface StreamObject {
  days: string | number;
  hours: string | number;
  minutes: string | number;
  seconds: string | number;
}

interface DurationObject {
  hours: string;
  minutes: string;
  seconds: string;
}

interface AuthorObject {
  name: string;
  url: string;
}
