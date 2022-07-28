import {
  AudioPlayerStatus,
  createAudioResource,
  entersState,
  StreamType,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  Client,
  GuildMember,
  Message,
  MessageReaction,
  TextChannel,
  User,
  VoiceChannel,
} from "discord.js";
import searchLyrics from "lyrics-finder";
import searchTrack from "yt-search";

import errors from "./data/errors.json";

import { DatabaseManager } from "./managers/DatabaseManager";
import { FiltersManager } from "./managers/FiltersManager";
import { PlaylistsManager } from "./managers/PlaylistsManager";
import { QueueManager } from "./managers/QueueManager";
import { UtilsManager } from "./managers/UtilsManager";
import { VoiceManager } from "./managers/VoiceManager";

import { PlayerEmitter } from "./PlayerEmitter";
import { PlayerError } from "./PlayerError";

import {
  CollectorData,
  ErrorData,
  LyricsData,
  PlayerError as PlayerErrorData,
  PlayerQueue,
  PlayerTrack,
} from "../types/PlayerData";
import { PlayerOptions } from "../types/PlayerOptions";
import { Collector, Events, Search } from "./PlayerEnums";

import ytdl from "./modules/dpm-ytdl";
import ms from "./modules/ms";

/**
 * Class that controls Player System
 *
 * @class
 * @classdesc Player Class
 * @extends {PlayerEmitter}
 */
export class Player extends PlayerEmitter {
  public client: Client;
  private ready: boolean;
  private readyTimestamp: number;

  public author: string;
  public website: string;
  public version: string;

  public filters: FiltersManager;
  public queue: QueueManager;
  public voice: VoiceManager;
  public utils: UtilsManager;
  public database: DatabaseManager;
  public playlists: PlaylistsManager;

  public errors: typeof errors;
  public options: PlayerOptions;

  /**
   * @constructor
   *
   * @param {Client} client Discord Client
   * @param {PlayerOptions} [options] Module Options
   */
  constructor(client: Client, options?: PlayerOptions) {
    super();

    if (!client)
      throw new PlayerError(
        errors.default.requireParam
          .replace("{param}", "client")
          .replace("{data}", "<Player>")
      );

    /**
     * Discord Client
     *
     * @type {Client}
     * @private
     */
    this.client = client;

    /**
     * Player Ready Status
     *
     * @type {boolean}
     * @private
     */
    this.ready = false;

    /**
     * Player Ready Timestamp
     *
     * @type {number}
     * @private
     */
    this.readyTimestamp = null;

    /**
     * Player Author
     *
     * @type {string}
     */
    this.author = require("../package.json").author;

    /**
     * Player Website URL
     *
     * @type {string}
     */
    this.website = require("../package.json").homepage;

    /**
     * Player Version
     *
     * @type {string}
     */
    this.version = require("../package.json").version;

    /**
     * Player Utils Manager
     *
     * @type {UtilsManager}
     */
    this.utils = new UtilsManager(this);

    /**
     * Player Errors JSON
     *
     * @type {object}
     */
    this.errors = errors;

    /**
     * Player Options
     *
     * @type {PlayerOptions}
     */
    this.options = this.utils.checkOptions(options);

    /**
     * Player Queue Manager
     *
     * @type {QueueManager}
     */
    this.queue = new QueueManager(this);

    /**
     * Player Voice Manager
     *
     * @type {VoiceManager}
     */
    this.voice = new VoiceManager(this);

    /**
     * Player Filters Manager
     *
     * @type {FiltersManager}
     */
    this.filters = new FiltersManager(this);

    /**
     * Player Database Manager
     *
     * @type {DatabaseManager}
     */
    this.database = new DatabaseManager(this);

    /**
     * Player Playlists Manager
     *
     * @type {PlaylistsManager}
     */
    this.playlists = new PlaylistsManager(this);

    this.init();

    this.on(Events.ERROR, async (data: PlayerErrorData) => {
      if (data.channel.text) {
        if (data.error.message.includes("Status code: 403")) {
          this.queue
            .get(data.channel.text.guild.id)
            .then(async (guildQueue: PlayerQueue) => {
              if (guildQueue?.channel)
                return this.initGuildTrack(
                  guildQueue.channel.text.guild.id,
                  guildQueue.tracks[0]
                );
            });
        }
      } else {
        this.queue
          .get(data.channel.text.guild.id)
          .then(async (guildQueue: PlayerQueue) => {
            if (guildQueue?.channel) {
              const guildConnection = guildQueue.connection;

              if (
                guildConnection.state.status != VoiceConnectionStatus.Destroyed
              ) {
                guildConnection.destroy();

                return this.queue.delete(guildQueue.channel.text.guild.id);
              } else this.queue.delete(guildQueue.channel.text.guild.id);
            }
          });
      }
    });
  }

  /**
   * Player Ready Timestamp
   *
   * @type {number}
   *
   * @returns {number} Player ready timestamp
   */
  public get readyAt(): number {
    return this.readyTimestamp;
  }

  /**
   * Player is ready?
   *
   * @type {boolean}
   *
   * @returns {boolean} Player ready status
   */
  public get isReady(): boolean {
    return this.ready;
  }

  /**
   * Allows you to initialize the next track for playback
   *
   * @param {string} guildID Discord Guild ID
   * @param {PlayerTrack} track Track info
   *
   * @fires Player#error
   * @fires Player#playingTrack
   * @fires Player#queueEnded
   * @private
   *
   * @example
   * const searchResults = await client.player.search('Query', message.member, message.channel);
   * if(searchResults?.error) return message.channel.send({ content: `No results found!` });
   *
   * client.player.initGuildTrack('GuildID', searchResults[0]);
   *
   * @returns {Promise<void | ErrorData>} Void or error object
   */
  public initGuildTrack(
    guildID: string,
    track: PlayerTrack
  ): Promise<void | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!guildID)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "guildID")
            .replace("{data}", "<Player>.initGuildTrack")
        );

      const guildQueue = await this.queue.get(guildID);
      if ("error" in guildQueue)
        return res({
          error: {
            code: 404,
            message: this.errors.default.missingQueue.replace("{id}", guildID),
          },
        });

      const guildConnection = guildQueue.connection;

      if (!track) {
        if (guildQueue.tracks) {
          if (guildConnection.state.status != VoiceConnectionStatus.Destroyed) {
            guildConnection.destroy();

            this.queue.delete(guildID);

            return this.emit(Events.QUEUE_ENDED, guildQueue);
          } else return this.queue.delete(guildID);
        }
      }

      try {
        const stream = await ytdl(track.url, {
          filter: guildQueue.filter.value,
        });
        const resource = createAudioResource(stream, {
          inputType: StreamType.OggOpus,
          inlineVolume: true,
        });
        const guildDispatcher = guildQueue.dispatcher;

        try {
          await entersState(
            guildConnection,
            VoiceConnectionStatus.Ready,
            5_000
          );

          guildDispatcher.play(resource);
          guildDispatcher.setMaxListeners(0);

          (guildConnection.state as any).subscription?.player
            ? false
            : guildConnection.subscribe(guildDispatcher);
        } catch (error) {
          if (guildQueue) this.queue.delete(guildID);
          if (guildConnection.state.status != VoiceConnectionStatus.Destroyed)
            guildConnection.destroy();

          return this.emit(Events.ERROR, {
            channel: { text: track.channel.text, voice: track.channel.voice },
            requested: track.requested,
            method: "initGuildTrack",
            error: error,
          });
        }

        guildDispatcher.once(AudioPlayerStatus.Idle, async () => {
          if (guildQueue.tracks.length <= 0) {
            if (
              guildConnection.state.status != VoiceConnectionStatus.Destroyed
            ) {
              guildConnection.destroy();

              this.queue.delete(guildID);
            } else this.queue.delete(guildID);

            return this.emit(Events.QUEUE_ENDED, guildQueue);
          }

          if (guildQueue.loop.track)
            this.initGuildTrack(guildID, guildQueue.tracks[0]);

          if (guildQueue.loop.queue) {
            const lastTrack = guildQueue.tracks.shift();

            guildQueue.tracks.push(lastTrack);

            this.initGuildTrack(guildID, guildQueue.tracks[0]);
          }

          if (!guildQueue.loop.track && !guildQueue.loop.queue) {
            guildQueue.tracks.shift();

            this.initGuildTrack(guildID, guildQueue.tracks[0]);
          }
        });

        guildDispatcher.on("error", async (error) => {
          if (guildQueue) this.queue.delete(guildID);

          this.emit(Events.ERROR, {
            channel: { text: track.channel.text, voice: track.channel.voice },
            requested: track.requested,
            method: "initGuildTrack",
            error: error,
          });
        });

        (guildDispatcher.state as any).resource.volume.setVolume(
          guildQueue.volume / this.options.defaultVolume
        );

        return this.emit(Events.TRACK_PLAYING, guildQueue.tracks[0]);
      } catch (error) {
        return this.emit(Events.ERROR, {
          channel: { text: track.channel.text, voice: track.channel.voice },
          requested: track.requested,
          method: "initGuildTrack",
          error: error,
        });
      }
    });
  }

  /**
   * Allows you to search for tracks in YouTube by link/title
   *
   * @param {string} query Search query
   * @param {GuildMember} member Discord Guild Member
   * @param {TextChannel} channel Discord Guild Text Channel
   * @param {boolean} [isPlaylist] Search type
   *
   * @example
   * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
   *
   * console.log(searchData);
   *
   * @returns {Promise<PlayerTrack[] | ErrorData>} Array with search results or error object
   */
  public search(
    query: string,
    member: GuildMember,
    channel: TextChannel,
    isPlaylist?: boolean
  ): Promise<PlayerTrack[] | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!query)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "query")
            .replace("{data}", "<Player>.search")
        );
      if (!member)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "member")
            .replace("{data}", "<Player>.search")
        );
      if (!channel)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "channel")
            .replace("{data}", "<Player>.search")
        );

      const voiceChannel = member?.voice?.channel as VoiceChannel;
      if (!voiceChannel)
        return res({
          error: {
            code: 404,
            message: this.errors.voice.notConnected.replace(
              "{id}",
              member.user.id
            ),
          },
        });

      if (query.startsWith("http://") || query.startsWith("https://")) {
        const trackInfo = await ytdl.getInfo(query).catch((error: Error) => {
          return res({
            error: {
              code: 404,
              message: this.errors.other.unknownTrack.replace("{data}", query),
            },
          });
        });

        if (!trackInfo)
          return res({
            error: {
              code: 404,
              message: this.errors.other.unknownTrack.replace("{data}", query),
            },
          });

        const duration = this.utils.formatnumbers([
          Math.floor(Number(trackInfo.videoDetails.lengthSeconds) / 3600),
          Math.floor((Number(trackInfo.videoDetails.lengthSeconds) / 60) % 60),
          Math.floor(Number(trackInfo.videoDetails.lengthSeconds) % 60),
        ]);

        const track: PlayerTrack = {
          searchType: Search.URL,
          title: trackInfo.videoDetails.title,
          url: trackInfo.videoDetails.video_url,
          thumbnail: trackInfo.videoDetails.thumbnails[0].url,

          author: {
            name: trackInfo.videoDetails.author.name,
            url: trackInfo.videoDetails.author.channel_url,
          },

          channel: {
            text: channel,
            voice: voiceChannel,
          },

          guild: member.guild,
          requested: member.user,

          duration: {
            hours: duration[0],
            minutes: duration[1],
            seconds: duration[2],
          },
        };

        if (isPlaylist) this.initQueueTrack(1, [track]);
        else if (this.options.autoAddingTracks) this.initQueueTrack(1, [track]);

        return res([track]);
      } else {
        const results: PlayerTrack[] = [];

        const searchResults = await searchTrack(query);
        if (searchResults.videos.length <= 0)
          return res({
            error: {
              code: 404,
              message: this.errors.other.unknownTrack.replace("{data}", query),
            },
          });

        for (
          let i = 0;
          searchResults.videos.length &&
          searchResults.videos.length < this.options.searchResultsLimit
            ? i < searchResults.videos.length
            : i < this.options.searchResultsLimit;
          i++
        ) {
          const video = searchResults.videos[i];
          const duration = this.utils.formatnumbers([
            Math.floor(searchResults.videos[i].duration.seconds / 3600),
            Math.floor((searchResults.videos[i].duration.seconds / 60) % 60),
            Math.floor(searchResults.videos[i].duration.seconds % 60),
          ]);

          results.push({
            index: i + 1,
            searchType: Search.TITLE,
            title: video.title,
            url: video.url,
            thumbnail: video.thumbnail,

            author: {
              name: video.author.name,
              url: video.author.url,
            },

            channel: {
              text: channel,
              voice: voiceChannel,
            },

            guild: member.guild,
            requested: member.user,

            duration: {
              hours: duration[0],
              minutes: duration[1],
              seconds: duration[2],
            },
          });
        }

        return res(results);
      }
    });
  }

  /**
   * Allows you to find lyrics for songs by their name
   *
   * @param {String} query Track name
   *
   * @example
   * const lyricsData = await client.player.lyrics('Imagine Dragons - Thunder');
   * if(lyricsData?.result) return message.channel.send({ content: `${lyricsData.query}\n\n${lyricsData.result}` });
   *
   * @returns {Promise<LyricsData | ErrorData>} Returns a result or error object
   */
  public lyrics(query: string): Promise<LyricsData | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!query)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "query")
            .replace("{data}", "<Player>.getLyrics")
        );

      const result: string = await searchLyrics(query);
      if (!result)
        return res({
          error: {
            code: 404,
            message: this.errors.other.notLyrics.replace("{query}", query),
          },
        });

      return res({ query: query, result: result });
    });
  }

  /**
   * Allows you to add tracks to the playback queue
   *
   * @param {number} index Track index
   * @param {PlayerTrack[]} results Array with search results
   *
   * @example
   * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
   * if(searchData[0]?.title) client.player.initQueueTrack(1, searchData);
   *
   * @returns {Promise<void>} Void
   */
  public initQueueTrack(index: number, results: PlayerTrack[]): Promise<void> {
    return new Promise(async (res, rej) => {
      if (!index)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "index")
            .replace("{data}", "<Player>.initQueueTrack")
        );
      if (!results)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "results")
            .replace("{data}", "<Player>.initQueueTrack")
        );

      return this.queue.add(results[index - 1]);
    });
  }

  /**
   * Allows you to create a collector to select a track from a list
   *
   * @param {Collector} type Collector type
   * @param {Message} message Discord Guild Message
   * @param {PlayerTrack[]} results Search results
   * @param {string} [userID] Requested user ID
   *
   * @example
   * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
   *
   * // Reaction collector
   * if(searchData[0]?.title && searchData.length === 10) client.player.createCollector(Collector.REACTION, message, searchData, 'UserID');
   *
   * // Message collector
   * if(searchData[0]?.title && searchData.length > 1) {
   *      const msg = await message.channel.send({ content: searchData.map((track, index) => `${index + 1} ${track.title}`).join('\n') });
   *      client.player.createCollector(Collector.MESSAGE, msg, searchData, 'UserID');
   * }
   * @returns {Promise<CollectorData | ErrorData>} object with received data or error
   */
  public createCollector(
    type: Collector,
    message: Message,
    results: PlayerTrack[],
    userID?: string
  ): Promise<CollectorData | ErrorData> {
    return new Promise(async (res, rej) => {
      if (!type)
        throw new PlayerError(
          this.errors.default.requireParam
            .replace("{param}", "type")
            .replace("{data}", "<Player>.createCollector")
        );

      switch (type) {
        case Collector.MESSAGE: {
          if (!message)
            throw new PlayerError(
              this.errors.default.requireParam
                .replace("{param}", "message")
                .replace("{data}", "<Player>.createReactionsCollector")
            );
          if (!results)
            throw new PlayerError(
              this.errors.default.requireParam
                .replace("{param}", "results")
                .replace("{data}", "<Player>.createReactionsCollector")
            );

          if (results.length <= 0)
            throw new PlayerError(
              this.errors.collectors.unknownResults.replace("{type}", "Message")
            );

          const filter = (msg: Message) =>
            msg.author.id.includes(userID || message.author.id);
          const collector = message.channel.createMessageCollector({
            filter,
            max: this.options.collectorsConfig.message.attempts,
            time: ms(this.options.collectorsConfig.message.time) as number,
          });

          collector.on("collect", async (collectMsg) => {
            const collectValue = Number(collectMsg.content);

            if (!isNaN(collectValue)) {
              if (collectValue <= 0) {
                collector.stop();

                return res({
                  error: {
                    code: 404,
                    message: this.errors.collectors.smallValue
                      .replace("{type}", "Message")
                      .replace("{value}", collectValue.toString())
                      .replace("{min}", "1"),
                  },
                });
              }

              if (collectValue > results.length) {
                collector.stop();

                return res({
                  error: {
                    code: 404,
                    message: this.errors.collectors.largeValue
                      .replace("{type}", "Message")
                      .replace("{value}", collectValue.toString())
                      .replace("{max}", results.length.toString()),
                  },
                });
              }

              const track = results[collectValue - 1];

              if (this.options.autoAddingTracks) {
                collector.stop();

                this.initQueueTrack(collectValue, results);
              } else collector.stop();

              return res({ index: collectValue, track: track, data: results });
            }
          });

          break;
        }

        case Collector.REACTION: {
          if (!message)
            throw new PlayerError(
              this.errors.default.requireParam
                .replace("{param}", "message")
                .replace("{data}", "<Player>.createReactionsCollector")
            );
          if (!results)
            throw new PlayerError(
              this.errors.default.requireParam
                .replace("{param}", "results")
                .replace("{data}", "<Player>.createReactionsCollector")
            );
          if (!userID)
            throw new PlayerError(
              this.errors.default.requireParam
                .replace("{param}", "userID")
                .replace("{data}", "<Player>.createReactionsCollector")
            );

          if (results.length <= 0)
            throw new PlayerError(
              this.errors.collectors.unknownResults.replace("{type}", "Message")
            );
          if (results.length > 10)
            throw new PlayerError(
              this.errors.collectors.unknownCollector
                .replace("{type}", "Reaction")
                .replace("{value}", "10")
                .replace("{collector}", "Message")
            );

          const reacts = this.options.collectorsConfig.reaction.reactions;

          for (let i = 0; i < results.length; i++) {
            if (reacts[i]) await message.react(reacts[i]);
          }

          const filter = (reaction: MessageReaction, user: User) =>
            reaction.message.id === message.id && user.id === userID;
          const collector = message.createReactionCollector({
            filter,
            time: ms(this.options.collectorsConfig.reaction.time) as number,
            maxEmojis: 1,
            max: this.options.collectorsConfig.reaction.attempts,
          });

          collector.on("collect", async (r, u) => {
            const emoji = r.emoji.name;

            reacts.forEach((react) => {
              if (emoji === react) {
                const index = react === "🔟" ? 10 : Number(react[0]);
                const track = results[index - 1];

                if (this.options.autoAddingTracks)
                  this.initQueueTrack(index, results);

                collector.stop();

                return res({ index: index, track: track, data: results });
              }
            });
          });

          break;
        }
      }
    });
  }

  /**
   * Method for initializing module
   *
   * @private
   */
  private init(): void {
    const interval = setInterval(async () => {
      if (this.client.isReady()) {
        this.ready = true;
        this.readyTimestamp = Date.now();

        this.emit(Events.READY, this);

        clearInterval(interval);
      }
    }, 100);
  }
}

/**
 * Module Options
 *
 * @typedef {object} PlayerOptions
 *
 * @prop {boolean} [autoAddingTracks=true] Automatic addition of tracks to the queue (excluding playlists)
 * @prop {number} [searchResultsLimit=10] number of results to be returned when searching for tracks by title
 * @prop {boolean} [synchronLoop=true] Automatic synchronization of `loop.track` and `loop.queue` options
 * @prop {number} [defaultVolume=5] Default server queue playback volume
 * @prop {DatabaseConfig} [databaseConfig] Database configuration object
 * @prop {ProgressConfig} [progressConfig] Progress bar configuration object
 * @prop {CollectorsConfig} [collectorsConfig] Collectors configuration object
 */

/**
 * Database Config
 * @typedef {object} DatabaseConfig
 * @prop {string} [path="./dpm.playlists.json"] Path to module database file
 * @prop {string} [checkInterval="5s"] Interval for checking and updating the module database
 */

/**
 * Progress Config
 * @typedef {object} ProgressConfig
 * @prop {number} [size=11] Progress bar size
 * @prop {string} [line="▬"] Progress bar line
 * @prop {string} [slider="🔘"] Progress bar slider
 */

/**
 * Collector Config
 * @typedef {object} CollectorsConfig
 * @prop {MessageCollectorConfig} message Message Collector Configurations
 * @prop {ReactionCollectorConfig} reaction Message Collector Configurations
 */

/**
 * Message Collector Config
 * @typedef {object} MessageCollectorConfig
 * @prop {string} [time="1m"] Collector Time
 * @prop {number} [attempts=1] Maximum number of attempts to select a track
 */

/**
 * Reaction Collector Config
 * @typedef {object} ReactionCollectorConfig
 * @prop {string} [time="30s"] Collector Time
 * @prop {number} [attempts=1] Maximum number of attempts to select a track
 * @prop {string[]} [reactions=[]] Array of reactions for collector
 */

/**
 * @typedef {object} Filter
 *
 * @prop {string} [3D] 3D filter
 * @prop {string} [bassboost] Bassboost filter
 * @prop {string} [echo] Echo filter
 * @prop {string} [fadein] Fadein filter
 * @prop {string} [flanger] Flanger filter
 * @prop {string} [gate] Gate filter
 * @prop {string} [haas] Haas filter
 * @prop {string} [karaoke] Karaoke filter
 * @prop {string} [nightcore] Nightcore filter
 * @prop {string} [reverse] Reverse filter
 * @prop {string} [vaporwave] Vaporwave filter
 * @prop {string} [mcompand] MCompand filter
 * @prop {string} [phaser] Phaser filter
 * @prop {string} [tremolo] Tremolo filter
 * @prop {string} [surround] Surround filter
 * @prop {string} [slowed] Slowed filter
 * @prop {string} [earwax] Earwax filter
 * @prop {string} [underwater] Underwater filter
 * @prop {string} [clear] Clear filter
 */

/******************************************* Player Events JSDoc *******************************************/

/**
 * Emits when the module is ready
 *
 * @event Player#ready
 *
 * @param {Player} player Player instance
 */

/**
 * Emitted when a module can't do anything and gets an error
 * @event Player#error
 *
 * @param {ChannelTypes} [channel] Error Channels
 * @param {User} requested Requested User
 * @param {string} method Module method
 * @param {Error} error Error object
 */

/**
 * Emitted when a new track is added to the server queue
 * @event Player#addedTrack
 *
 * @param {number} [index] Track index
 * @param {string} searchType Search type
 * @param {string} title Track title
 * @param {string} url Track URL
 * @param {string} thumbnail Track thumbnail
 * @param {AuthorObject} author Track author object
 * @param {ChannelTypes} channel Track active channels
 * @param {Guild} guild Discord Guild
 * @param {User} requested Requested track user object
 * @param {DurationObject} duration Track duration
 */

/**
 * Emitted when a new track starts playing in the server queue
 * @event Player#playingTrack
 *
 * @param {number} [index] Track index
 * @param {string} searchType Search type
 * @param {string} title Track title
 * @param {string} url Track URL
 * @param {string} thumbnail Track thumbnail
 * @param {AuthorObject} author Track author object
 * @param {ChannelTypes} channel Track active channels
 * @param {Guild} guild Discord Guild
 * @param {User} requested Requested track user object
 * @param {DurationObject} duration Track duration
 */

/**
 * Emitted when a new server playlist is created
 * @event Player#createdPlaylist
 *
 * @param {string} id Playlist ID
 * @param {string} title Playlist Title
 * @param {string} author Playlist Author ID
 * @param {number} created Playlist create timestamp
 * @param {number} updated Playlist update timestamp
 * @param {number} duration Playlist duration
 * @param {number} lastPlaying Playlist last playind timestamp
 * @param {PlaylistTrack[]} tracks Playlist tracks array
 */

/**
 * Emitted when the server playlist is deleted
 * @event Player#deletedPlaylist
 *
 * @param {string} id Playlist ID
 * @param {string} title Playlist Title
 * @param {string} author Playlist Author ID
 * @param {number} created Playlist create timestamp
 * @param {number} updated Playlist update timestamp
 * @param {number} duration Playlist duration
 * @param {number} lastPlaying Playlist last playind timestamp
 * @param {PlaylistTrack[]} tracks Playlist tracks array
 */

/**
 * Emitted when a new server queue is started
 * @event Player#queueStarted
 *
 * @param {ChannelTypes} channel Queue active channels
 * @param {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @param {PlayerTrack[]} tracks Guild Tracks Array
 * @param {VoiceConnection} connection Discord Guild Client Voice Connection
 * @param {LoopModes} loop Loop object
 * @param {number} volume Guild queue playback volume
 * @param {number} startStream Timestamp start playing server queue
 * @param {GuildQueueState} state Queue playback status
 * @param {PlayerFilter} filter Queue playback filter
 */

/**
 * Emitted when the server queue finishes playing
 * @event Player#queueEnded
 *
 * @param {ChannelTypes} channel Queue active channels
 * @param {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @param {PlayerTrack[]} tracks Guild Tracks Array
 * @param {VoiceConnection} connection Discord Guild Client Voice Connection
 * @param {LoopModes} loop Loop object
 * @param {number} volume Guild queue playback volume
 * @param {number} startStream Timestamp start playing server queue
 * @param {GuildQueueState} state Queue playback status
 * @param {PlayerFilter} filter Queue playback filter
 */

/**
 * Emitted when the playback state of the server queue changes.
 * @event Player#queueStateChange
 *
 * @param {object} data
 * @param {PlayerQueue} data.queue Guild queue object
 * @param {GuildQueueState} data.oldState Guild queue old state value
 * @param {GuildQueueState} data.newState Guild queue new state value
 */

/***********************************************************************************************************/

/*************************************** Player Other Typedefs JSDoc ***************************************/

/**
 * @typedef {object} DefaultData
 *
 * @prop {boolean} status Operation progress status
 */

/**
 * @typedef {object} PlayerTrack
 *
 * @prop {number} [index] Track index
 * @prop {string} searchType Search type
 * @prop {string} title Track title
 * @prop {string} url Track URL
 * @prop {string} thumbnail Track thumbnail
 * @prop {AuthorObject} author Track author object
 * @prop {ChannelTypes} channel Track active channels
 * @prop {Guild} guild Discord Guild
 * @prop {User} requested Requested track user object
 * @prop {DurationObject} duration Track duration
 */

/**
 * @typedef {object} PlayerQueue
 *
 * @prop {ChannelTypes} channel Queue active channels
 * @prop {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @prop {PlayerTrack[]} tracks Guild Tracks Array
 * @prop {VoiceConnection} connection Discord Guild Client Voice Connection
 * @prop {LoopModes} loop Loop object
 * @prop {number} volume Guild queue playback volume
 * @prop {number} startStream Timestamp start playing server queue
 * @prop {GuildQueueState} state Queue playback status
 * @prop {PlayerFilter} filter Queue playback filter
 */

/**
 * @typedef {object} LyricsData
 *
 * @prop {string} query Search query
 * @prop {string} result Lyrics content
 */

/**
 * @typedef {object} PlayerFilter
 *
 * @prop {string} name Filter name
 * @prop {string} value Filter value
 */

/**
 * @typedef {object} PlaylistTrack
 *
 * @prop {string} url Track URL
 * @prop {string} title Track Title
 */

/**
 * @typedef {object} CreatePlaylistData
 *
 * @prop {string} [title] Playlist Title
 * @prop {string} author Playlist Author ID
 * @prop {PlaylistTrack} track Playlist track object
 */

/**
 * @typedef {object} AddPlaylistData
 *
 * @prop {string} [id] Playlist ID
 * @prop {PlaylistTrack} track Playlist track object
 */

/**
 * @typedef {object} GuildPlaylist
 *
 * @prop {string} id Playlist ID
 * @prop {string} title Playlist Title
 * @prop {string} author Playlist Author ID
 * @prop {number} created Playlist create timestamp
 * @prop {number} updated Playlist update timestamp
 * @prop {number} duration Playlist duration
 * @prop {number} lastPlaying Playlist last playind timestamp
 * @prop {PlaylistTrack[]} tracks Playlist tracks array
 */

/**
 * @typedef {object} ErrorData
 *
 * @prop {object} error Error object
 * @prop {number} error.code Error code
 * @prop {string} error.message Error message
 */

/**
 * @typedef {object} SkipData
 *
 * @prop {PlayerTrack} current Current track object
 * @prop {PlayerTrack} next Next track object
 */

/**
 * @typedef {object} CollectorData
 *
 * @prop {number} index Collected index
 * @prop {PlayerTrack} track User selected track object
 * @prop {PlayerTrack[]} data List of available tracks
 */

/**
 * @typedef {object} ProgressData
 *
 * @prop {string} bar Progress bar
 * @prop {string} percents Progress percents
 */

/**
 * @typedef {object} StreamData
 *
 * @prop {object} loop Loop object
 * @prop {boolean} loop.track Loop current track status
 * @prop {boolean} loop.queue Loop guild queue status
 * @prop {PlayerFilter} filter Stream filter
 * @prop {GuildQueueState} state Stream status value
 * @prop {number} volume Stream volume value
 * @prop {StreamObject} streamTime Stream duration object
 */

/**
 * @typedef {object} LoopModes
 *
 * @prop {boolean} track Loop track status
 * @prop {boolean} queue Loop queue status
 */

/**
 * @typedef {object} RemoveTrackData
 *
 * @prop {PlayerTrack} deleted Remove track object
 * @prop {PlayerTrack[]} tracks Updated tracks list
 */

/**
 * @typedef {object} PlayerError
 *
 * @prop {ChannelTypes} [channel] Error Channels
 * @prop {User} requested Requested User
 * @prop {string} method Module method
 * @prop {Error} error Error object
 */

/**
 * @typedef {object} StreamOptions
 *
 * @prop {number} [seek=0] Seek value
 * @prop {string} [filter] Filter value
 */

/**
 * Channel Types
 * @typedef {object} ChannelTypes
 * @prop {TextChannel} text Discord Guild Text Channel
 * @prop {VoiceChannel} voice Discord Guild Voice Channel
 */

/**
 * Stream Time Object
 * @typedef {object} StreamObject
 * @prop {string | number} days Stream Duration in days
 * @prop {string | number} hours Stream Duration in hours
 * @prop {string | number} minutes Stream Duration in minutes
 * @prop {string | number} seconds Stream Duration in seconds
 */

/**
 * Duration Object
 * @typedef {object} DurationObject
 * @prop {string} hours Duration in hours
 * @prop {string} minutes Duration in minutes
 * @prop {string} seconds Duration in seconds
 */

/**
 * Loop Modes
 * @typedef {object} LoopModes
 * @prop {boolean} track Loop Track status
 * @prop {boolean} queue Loop Queue status
 */

/**
 * Loop Modes
 * @typedef {object} AuthorObject
 * @prop {string} name Author Name
 * @prop {string} url Author Avatar URL
 */

/***********************************************************************************************************/
