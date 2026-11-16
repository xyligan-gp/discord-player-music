import { join } from 'node:path';
import { Client, Events as DiscordEvents, GuildMember, Message, MessageReaction, TextChannel, User, VoiceChannel } from 'discord.js';

import errors from './data/errors.json';

import { FiltersManager } from './managers/FiltersManager';
import { QueueManager } from './managers/QueueManager';
import { VoiceManager } from './managers/VoiceManager';
import { UtilsManager } from './managers/UtilsManager';

import { PlayerError, PlayerErrorCode, requireParam } from './PlayerError';
import { PlayerEmitter } from './PlayerEmitter';

import { Collector, Events, Search } from './PlayerEnums';
import { PlayerOptions, ResolvedPlayerOptions } from './types/PlayerOptions';
import { LyricsData, PlayerTrack, CollectorData } from './types/PlayerData';



import { SourceRegistry } from './sources/SourceRegistry';
import { YoutubeiProvider } from './sources/YoutubeiProvider';
import { YtDlpProvider } from './sources/YtDlpProvider';
import { SourceTrack } from './sources/SourceProvider';

import { LyricsProvider } from './lyrics/LyricsProvider';
import { LrclibProvider } from './lyrics/LrclibProvider';

// package.json lies in the root of the package: one folder up from `src` (development, tests) and two folders up from `dist/src` (the built module)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require(join(__dirname, __dirname.endsWith(join('dist', 'src')) ? '../../package.json' : '../package.json'));

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
    private readyTimestamp: number | null;

    public author: string;
    public website: string;
    public version: string;

    public filters: FiltersManager;
    public queue: QueueManager;
    public voice: VoiceManager;
    public utils: UtilsManager;
    public sources: SourceRegistry;
    public lyricsProvider: LyricsProvider;

    public errors: typeof errors;
    public options: ResolvedPlayerOptions;

    /**
     * @constructor
     *
     * @param {Client} client Discord Client
     * @param {PlayerOptions} [options] Module Options
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the client is not passed
     */
    constructor(client: Client, options?: PlayerOptions) {
        super();

        requireParam(client, 'client', '<Player>');

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
        this.author = pkg.author;

        /**
         * Player Website URL
         *
         * @type {string}
         */
        this.website = pkg.homepage;

        /**
         * Player Version
         *
         * @type {string}
         */
        this.version = pkg.version;

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
        this.filters = new FiltersManager();



        /**
         * Player Source Registry. Providers are tried in order of priority.
         *
         * @type {SourceRegistry}
         */
        this.sources = new SourceRegistry(this.options.sources ?? [new YoutubeiProvider({ cookies: this.options.cookies }), new YtDlpProvider({ cookies: this.options.cookies })], { failureThreshold: this.options.sourceFailureThreshold, cooldown: this.utils.parseDuration(this.options.sourceCooldown) });
        this.sources.onProviderFailed = (provider, method, error) => { this.emit(Events.PROVIDER_FAILED, { provider: provider.name, method, error }) };

        /**
         * Player Lyrics Provider
         * 
         * @type {LyricsProvider}
         */
        this.lyricsProvider = this.options.lyrics ?? new LrclibProvider();

        // Every step of finding, checking, downloading and updating yt-dlp becomes a `ytdlpStatus` event
        for(const provider of this.sources.list) {
            if(provider instanceof YtDlpProvider) provider.onStatus = event => { this.emit(Events.YTDLP_STATUS, event) };
        }

        // Providers prepare themselves in the background (a session, the yt-dlp download and its update), a failure is only reported
        for(const provider of this.sources.list) {
            Promise.resolve().then(() => provider.prepare?.()).catch((error: Error) => this.emit(Events.ERROR, { method: `<${provider.name}>.prepare`, error }));
        }

        this.init();
    }

    /**
     * Player Ready Timestamp
     *
     * @type {number}
     *
     * @returns {number | null} Player ready timestamp (`null` until the player is ready)
     */
    public get readyAt(): number | null {
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
     * Allows you to initialize the next track for playback. A track that can not be played is reported with the `error` event and skipped.
     * When no track is passed, the queue is ended.
     *
     * @param {string} guildID Discord Guild ID
     * @param {PlayerTrack} [track] Track info
     *
     * @fires Player#error
     * @fires Player#playingTrack
     * @fires Player#queueEnded
     * @private
     *
     * @example
     * const searchResults = await client.player.search('Query', message.member, message.channel);
     *
     * client.player.initGuildTrack('GuildID', searchResults[0]);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the server ID is not passed
     *
     * @returns {Promise<void>} Resolves when the track has started
     */
    public async initGuildTrack(guildID: string, track?: PlayerTrack): Promise<void> {
        requireParam(guildID, 'guildID', '<Player>.initGuildTrack');

        await this.queue.get(guildID);

        return this.queue.startTrack(guildID, track);
    }

    /**
     * Allows you to search for tracks by link/title using the source providers. A playlist link adds all its tracks to the queue and starts playing them.
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
     * @throws {PlayerError} `MISSING_PARAMETER` if a parameter is missing, `USER_NOT_IN_VOICE` if the member is not in a voice channel, `TRACK_NOT_FOUND` if nothing was found, `SIGN_IN_REQUIRED` if YouTube asks to sign in (an age-restricted video)
     *
     * @returns {Promise<Array<PlayerTrack>>} Array with search results. For a video link it is one track, for a playlist link it is all the tracks of the playlist (up to `playlistLimit`). Links are added to the queue if `autoAddingTracks` is enabled, a playlist starts playing from its first track.
     */
    public async search(query: string, member: GuildMember, channel: TextChannel, isPlaylist?: boolean): Promise<Array<PlayerTrack>> {
        requireParam(query, 'query', '<Player>.search');
        requireParam(member, 'member', '<Player>.search');
        requireParam(channel, 'channel', '<Player>.search');

        const voiceChannel = member.voice?.channel as VoiceChannel | null;
        if(!voiceChannel) throw new PlayerError(PlayerErrorCode.USER_NOT_IN_VOICE, { id: member.user.id });

        /**
         * Converts a track of a source provider to a player track
         *
         * @param {SourceTrack} item Source track
         * @param {string} searchType Search type
         * @param {number} [index] Track number in the results
         *
         * @returns {PlayerTrack} Player track
         * @private
         */
        const toTrack = (item: SourceTrack, searchType: Search, index?: number): PlayerTrack => {
            const [hours, minutes, seconds] = this.utils.formatnumbers([Math.floor(item.seconds / 3600), Math.floor(item.seconds / 60 % 60), Math.floor(item.seconds % 60)]);

            return {
                ...(index === undefined ? {} : { index }),
                searchType,
                title: item.title,
                url: item.url,
                thumbnail: item.thumbnail,

                author: {
                    name: item.author.name,
                    url: item.author.url
                },

                channel: {
                    text: channel,
                    voice: voiceChannel
                },

                guild: member.guild,
                requested: member.user,

                duration: { hours, minutes, seconds },
                source: item.source
            }
        }

        /**
         * Error of a failed search or resolve: when YouTube asks to sign in, the error says so (the cookies are needed), otherwise the track was not found
         *
         * @param {Error} error Error of the source providers
         *
         * @returns {PlayerError} Error to throw
         * @private
         */
        const notFound = (error: Error): PlayerError => new PlayerError(/sign in|LOGIN_REQUIRED|not a bot/i.test(error.message) ? PlayerErrorCode.SIGN_IN_REQUIRED : PlayerErrorCode.TRACK_NOT_FOUND, { data: query }, error);

        if(this.sources.isPlaylist(query)) {
            const playlist = await this.sources.resolvePlaylist(query, this.options.playlistLimit).catch((error: Error) => {
                throw notFound(error);
            })

            const tracks = playlist.tracks.map(item => toTrack(item, Search.PLAYLIST));

            // The tracks are added one by one, so they stay in the order of the playlist. The first one starts playing.
            if(isPlaylist || this.options.autoAddingTracks) {
                for(const track of tracks) await this.queue.add(track);
            }

            return tracks;
        }

        if(query.startsWith('http://') || query.startsWith('https://')) {
            const trackInfo = await this.sources.resolve(query).catch((error: Error) => {
                throw notFound(error);
            })

            const track = toTrack(trackInfo, Search.URL);

            if(isPlaylist || this.options.autoAddingTracks) await this.initQueueTrack(1, [track]);

            return [track];
        }

        const searchResults = await this.sources.search(query, this.options.searchResultsLimit).catch((error: Error) => {
            throw notFound(error);
        })

        if(!searchResults.length) throw new PlayerError(PlayerErrorCode.TRACK_NOT_FOUND, { data: query });

        return searchResults.slice(0, this.options.searchResultsLimit).map((item, i) => toTrack(item, Search.TITLE, i + 1));
    }

    /**
     * Allows you to find lyrics for songs by their name (LRCLIB by default, see the `lyrics` option)
     *
     * @param {String} query Track name
     *
     * @example
     * const lyricsData = await client.player.lyrics('Imagine Dragons - Thunder');
     *
     * return message.channel.send({ content: `${lyricsData.query}\n\n${lyricsData.result}` });
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the query is not passed, `LYRICS_NOT_FOUND` if no lyrics were found or the lyrics service can not be reached (see `cause`)
     *
     * @returns {Promise<LyricsData>} Query, lyrics and the song title and artist (if the provider knows them)
     */
    public async lyrics(query: string): Promise<LyricsData> {
        requireParam(query, 'query', '<Player>.lyrics');

        const found = await this.lyricsProvider.search(query).catch((error: Error) => {
            throw new PlayerError(PlayerErrorCode.LYRICS_NOT_FOUND, { query }, error);
        })

        if(!found) throw new PlayerError(PlayerErrorCode.LYRICS_NOT_FOUND, { query });

        return { query, result: found.text, title: found.title, artist: found.artist, source: found.source };
    }

    /**
     * Allows you to add a track from the search results to the queue
     *
     * @param {number} index Track number in the results (starting from 1)
     * @param {Array<PlayerTrack>} results Search results
     *
     * @example
     * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
     *
     * await client.player.initQueueTrack(1, searchData);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if a parameter is missing, `QUEUE_TRACK_NOT_FOUND` if there is no result with that number
     *
     * @returns {Promise<void>} Resolves when the track has been added
     */
    public async initQueueTrack(index: number, results: Array<PlayerTrack>): Promise<void> {
        requireParam(index, 'index', '<Player>.initQueueTrack');
        requireParam(results, 'results', '<Player>.initQueueTrack');

        const track = results[index - 1];
        if(!track) throw new PlayerError(PlayerErrorCode.QUEUE_TRACK_NOT_FOUND, { index, id: results[0]?.guild.id ?? '-' });

        await this.queue.add(track);
    }

    /**
     * Allows you to create a collector to select a track from a list.
     * The message collector waits for a number in the messages of the user, the reaction collector waits for a reaction with a number
     * (the bot needs the *Add Reactions* and *Read Message History* permissions and the `GuildMessageReactions` intent for it).
     * Every message or reaction of the user is an attempt (see `collectorsConfig.*.attempts`); the cancel word (`cancel`) or the cancel reaction (`❌`) cancels the selection.
     * The selected track is added to the queue when `autoAddingTracks` is enabled.
     *
     * @param {Collector} type Collector type
     * @param {Message} message Discord Guild Message (the message with the list of tracks that the bot sent)
     * @param {Array<PlayerTrack>} results Search results
     * @param {string} [userID] Requested user ID (required for the reaction collector)
     *
     * @example
     * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
     *
     * // Reaction collector (up to 10 results)
     * if(searchData.length <= 10) client.player.createCollector(Collector.REACTION, message, searchData, 'UserID');
     *
     * // Message collector
     * if(searchData.length > 1) {
     *      const msg = await message.channel.send({ content: searchData.map((track, index) => `${index + 1} ${track.title}`).join('\n') });
     *      client.player.createCollector(Collector.MESSAGE, msg, searchData, 'UserID');
     * }
     *
     * @throws {PlayerError} `MISSING_PARAMETER`, `COLLECTOR_NO_RESULTS`, `COLLECTOR_UNKNOWN` (more than 10 results for reactions), `COLLECTOR_TIMEOUT` (nothing was selected in time), `COLLECTOR_CANCELLED` (the user cancelled), `INVALID_VALUE`, `COLLECTOR_SMALL_VALUE` or `COLLECTOR_LARGE_VALUE` (the attempts were used up by wrong answers)
     *
     * @returns {Promise<CollectorData>} Selected track, its number and the list of tracks
     */
    public async createCollector(type: Collector, message: Message, results: Array<PlayerTrack>, userID?: string): Promise<CollectorData> {
        requireParam(type, 'type', '<Player>.createCollector');
        requireParam(message, 'message', '<Player>.createCollector');
        requireParam(results, 'results', '<Player>.createCollector');

        if(results.length <= 0) throw new PlayerError(PlayerErrorCode.COLLECTOR_NO_RESULTS, { type: type === Collector.REACTION ? 'Reaction' : 'Message' });

        const wrongAnswer = new PlayerError(PlayerErrorCode.INVALID_VALUE, { value: 'answer', data: `a number from 1 to ${results.length}` });

        /**
         * Runs the selection: waits for answers until one of them selects a track, cancels, the attempts are used up or the time is over
         *
         * @param {object} collector Collector of discord.js
         * @param {number} attempts Maximum number of attempts
         * @param {function} answer Handler of an answer: a number (the selected track), `'cancel'`, or an error for a wrong answer
         *
         * @returns {Promise<CollectorData>} Selected track
         * @private
         */
        const run = (collector: any, attempts: number, answer: (item: any) => number | 'cancel' | PlayerError | null): Promise<CollectorData> => new Promise<CollectorData>((resolve, reject) => {
            let used = 0;
            let settled = false;

            const settle = (action: () => void) => {
                if(settled) return;

                settled = true;
                collector.stop();

                action();
            }

            collector.on('collect', (item: unknown) => {
                if(settled) return;

                const result = answer(item);
                if(result === null) return;

                if(result === 'cancel') return settle(() => reject(new PlayerError(PlayerErrorCode.COLLECTOR_CANCELLED)));

                if(result instanceof PlayerError) {
                    // A wrong answer is an attempt: the user can try again while there are attempts left
                    if(++used >= attempts) settle(() => reject(result));

                    return;
                }

                settle(() => {
                    const done = () => resolve({ index: result, track: results[result - 1], data: results });

                    if(this.options.autoAddingTracks) this.initQueueTrack(result, results).then(done, reject);
                    else done();
                })
            })

            // The time is over (`time`), or the message with the list was deleted
            collector.on('end', (_collected: unknown, reason: string) => {
                if(settled) return;

                settled = true;

                reject(new PlayerError(reason === 'time' ? PlayerErrorCode.COLLECTOR_TIMEOUT : PlayerErrorCode.COLLECTOR_CANCELLED));
            })
        })

        switch(type) {
            case Collector.MESSAGE: {
                const { time, attempts, cancel } = this.options.collectorsConfig.message;

                const filter = (msg: Message) => msg.author.id === (userID || message.author.id);
                const collector = (message.channel as TextChannel).createMessageCollector({ filter, time: this.utils.parseDuration(time) });

                return run(collector, attempts, (collected: Message) => {
                    const text = collected.content.trim();

                    if(cancel && text.toLowerCase() === cancel.toLowerCase()) return 'cancel';

                    const value = Number(text);

                    if(!text || !Number.isInteger(value)) return wrongAnswer;
                    if(value < 1) return new PlayerError(PlayerErrorCode.COLLECTOR_SMALL_VALUE, { type: 'Message', value, min: 1 });
                    if(value > results.length) return new PlayerError(PlayerErrorCode.COLLECTOR_LARGE_VALUE, { type: 'Message', value, max: results.length });

                    return value;
                })
            }

            case Collector.REACTION: {
                requireParam(userID, 'userID', '<Player>.createCollector');

                if(results.length > 10) throw new PlayerError(PlayerErrorCode.COLLECTOR_UNKNOWN, { type: 'Reaction', value: 10, collector: 'Message' });

                const { time, attempts, reactions, cancel } = this.options.collectorsConfig.reaction;

                // Discord adds the invisible variation selector (U+FE0F) to some emojis, so it is ignored when emojis are compared
                const normalize = (emoji: string) => emoji.replace(/\uFE0F/g, '');
                const numbers = reactions.slice(0, results.length);

                for(const reaction of numbers) await message.react(reaction);
                if(cancel) await message.react(cancel);

                const filter = (reaction: MessageReaction, user: User) => reaction.message.id === message.id && user.id === userID;
                const collector = message.createReactionCollector({ filter, time: this.utils.parseDuration(time) });

                return run(collector, attempts, (reaction: MessageReaction) => {
                    const emoji = normalize(reaction.emoji.name ?? '');

                    if(cancel && emoji === normalize(cancel)) return 'cancel';

                    const position = numbers.findIndex(item => normalize(item) === emoji);

                    return position < 0 ? wrongAnswer : position + 1;
                })
            }

            default: throw new PlayerError(PlayerErrorCode.INVALID_VALUE, { value: 'type', data: Object.values(Collector).join(', ') });
        }
    }

    /**
     * Method for initializing module
     *
     * @private
     */
    private init(): void {
        const markReady = () => {
            this.ready = true;
            this.readyTimestamp = Date.now();

            this.emit(Events.READY, this);
        }

        if(this.client.isReady()) queueMicrotask(markReady);
        else this.client.once(DiscordEvents.ClientReady, markReady);
    }
}

/**
 * Module Options
 * 
 * @typedef {object} PlayerOptions
 * 
 * @prop {boolean} [autoAddingTracks=true] Whether `player.search()` (and a collector) adds the found track to the queue by itself. It is **not** the autoplay: it does nothing when the queue ends, see `autoplay`
 * @prop {boolean} [autoplay=false] The autoplay of new queues: when the tracks are over and no loop is on, related tracks are found, added to the queue and played, again and again (`queue.setAutoplay()` switches it for a server)
 * @prop {number} [autoplayLimit=3] How many related tracks the autoplay adds at once (a few tracks let the next track be prepared in advance)
 * @prop {number} [autoplayHistory=50] How many played tracks are remembered, so the autoplay does not add them again
 * @prop {string} [autoplayMaxDuration=15m] The autoplay skips tracks that are longer (and live streams)
 * @prop {number} [progressInterval=0] Every this many seconds the `trackProgress` event is emitted while a track plays (0 turns it off, the least value is 0.1). Discord limits how often a message can be edited, so use 5 seconds or more to update a message.
 * @prop {number} [searchResultsLimit=10] number of results to be returned when searching for tracks by title
 * @prop {LyricsProvider} [lyrics] Lyrics provider (LrclibProvider by default)
 * @prop {number} [playlistLimit=100] Maximum number of tracks that are taken from a playlist link
 * @prop {number} [sourceFailureThreshold=1] After this many failures in a row a source provider is used last for a while (the next tracks go to the next provider first)
 * @prop {string} [sourceCooldown=10m] For how long a failing source provider is used last
 * @prop {string} [cookies] Path of a cookies file (Netscape format) with the cookies of a signed-in YouTube account. It is used by both default providers (`youtubei.js` and `yt-dlp`). Needed when YouTube asks the server to sign in, see the FAQ.
 * @prop {number} [prefetchSeconds=20] The audio of the next track is prepared this many seconds before the current track ends, so there is no pause between tracks (0 disables it)
 * @prop {Array<SourceProvider>} [sources] Track source providers in order of priority (YoutubeiProvider and YtDlpProvider by default)
 * @prop {boolean} [synchronLoop=true] Automatic synchronization of `loop.track` and `loop.queue` options
 * @prop {number} [defaultVolume=5] Default server queue playback volume
 * @prop {object} [progressConfig] Progress bar configuration object
 * @prop {number} [size=11] Progress bar size
 * @prop {string} [line=▬] Progress bar line
 * @prop {string} [slider=🔘] Progress bar slider
 * @prop {object} [collectorsConfig] Collectors configuration object
 * @prop {object} [collectorsConfig.message] Message collector configuration object
 * @prop {string} [collectorsConfig.message.time=1m] Message collector run time
 * @prop {number} [collectorsConfig.message.attempts=1] Maximum number of attempts to select a track (every message of the user is an attempt)
 * @prop {string | boolean} [collectorsConfig.message.cancel='cancel'] The word that cancels the selection (`false` turns the cancel word off)
 * @prop {object} [collectorsConfig.reaction] Reaction collector configuration object
 * @prop {string} [collectorsConfig.reaction.time=30s] Reaction collector ran time
 * @prop {number} [collectorsConfig.reaction.attempts=1] Maximum number of attempts to select a track (every reaction of the user is an attempt)
 * @prop {Array<string>} [collectorsConfig.reaction.reactions=[]] Array react for collector
 * @prop {string | boolean} [collectorsConfig.reaction.cancel='❌'] The reaction that cancels the selection, it is added after the numbers (`false` turns it off)
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
 * @param {object} [channel] Error Channels
 * @param {TextChannel} [channel.text] Discord Guild text Channel
 * @param {VoiceChannel} [channel.voice] Discord Guild Voice Channel
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
 * @param {object} author Track author object
 * @param {string} author.name Track author name
 * @param {string} author.url Track author channel URL
 * @param {object} channel Track active channels
 * @param {TextChannel} channel.text Discord Guild Text Channel
 * @param {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @param {Guild} guild Discord Guild
 * @param {User} requested Requested track user object
 * @param {object} duration Track duration
 * @param {string} duration.hours Track duration in hours
 * @param {string} duration.minutes Track duration in minutes
 * @param {string} duration.seconds Track duration in seconds
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
 * @param {object} author Track author object
 * @param {string} author.name Track author name
 * @param {string} author.url Track author channel URL
 * @param {object} channel Track active channels
 * @param {TextChannel} channel.text Discord Guild Text Channel
 * @param {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @param {Guild} guild Discord Guild
 * @param {User} requested Requested track user object
 * @param {object} duration Track duration
 * @param {string} duration.hours Track duration in hours
 * @param {string} duration.minutes Track duration in minutes
 * @param {string} duration.seconds Track duration in seconds
 */

/**
 * Emitted when a new server queue is started
 * @event Player#queueStarted
 * 
 * @param {object} channel Queue active channels
 * @param {TextChannel} channel.text Discord Guild Text Channel
 * @param {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @param {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @param {Array<PlayerTrack>} tracks Guild Tracks Array
 * @param {VoiceConnection} connection Discord Guild Client Voice Connection
 * @param {object} loop Loop object
 * @param {boolean} loop.track Loop current track status
 * @param {boolean} loop.queue Loop guild queue status
 * @param {number} volume Guild queue playback volume
 * @param {number} startStream Timestamp start playing server queue
 * @param {GuildQueueState} state Queue playback status
 * @param {PlayerFilter} filter Queue playback filter
 */

/**
 * Emitted once every time a server queue is closed and removed, for any reason: the tracks are over, `queue.stop()`, `queue.delete()`, the last track was skipped
 * or the voice connection failed. The second argument tells why. Use `reason === 'ended'` to react only when the queue finishes playing by itself (the only case in 1.x).
 * @event Player#queueEnded
 * 
 * @param {object} channel Queue active channels
 * @param {TextChannel} channel.text Discord Guild Text Channel
 * @param {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @param {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @param {Array<PlayerTrack>} tracks Guild Tracks Array
 * @param {VoiceConnection} connection Discord Guild Client Voice Connection
 * @param {object} loop Loop object
 * @param {boolean} loop.track Loop current track status
 * @param {boolean} loop.queue Loop guild queue status
 * @param {number} volume Guild queue playback volume
 * @param {number} startStream Timestamp start playing server queue
 * @param {GuildQueueState} state Queue playback status
 * @param {PlayerFilter} filter Queue playback filter
 * @param {string} reason Why the queue was closed: `ended` (the tracks are over), `stopped` (`queue.stop()`), `deleted` (`queue.delete()`), `skipped` (the last track was skipped) or `error` (the voice connection failed)
 */

/**
 * Emitted when the autoplay found related tracks and added them to the end of the queue (the tracks are played right after; `addedTrack` is not emitted for them)
 * @event Player#autoplayAdded
 *
 * @param {object} queue Server queue
 * @param {Array<PlayerTrack>} tracks Added tracks (`searchType` is `Search.AUTOPLAY`, `requested` and the channels are the ones of the track that played before)
 */

/**
 * Emitted every `progressInterval` seconds (option, off by default) while a track plays: it is not emitted while the queue is paused or has no track. Use it to update a "now playing" message
 * (Discord limits how often a message can be edited: not more often than every 5-10 seconds).
 * @event Player#trackProgress
 *
 * @param {object} queue Server queue
 * @param {object} data Progress of the playing track
 * @param {PlayerTrack} data.track Playing track
 * @param {number} data.position Played time in seconds
 * @param {number} data.duration Duration of the track in seconds (0 for a live stream)
 * @param {string} data.bar Progress bar (see `progressConfig`)
 * @param {string} data.percents Played part, for example `32%`
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
 * @prop {object} author Track author object
 * @prop {string} author.name Track author name
 * @prop {string} author.url Track author channel URL
 * @prop {object} channel Track active channels
 * @prop {TextChannel} channel.text Discord Guild Text Channel
 * @prop {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @prop {Guild} guild Discord Guild
 * @prop {User} requested Requested track user object
 * @prop {object} duration Track duration
 * @prop {string} duration.hours Track duration in hours
 * @prop {string} duration.minutes Track duration in minutes
 * @prop {string} duration.seconds Track duration in seconds
 */

/**
 * @typedef {object} PlayerQueue
 * 
 * @prop {object} channel Queue active channels
 * @prop {TextChannel} channel.text Discord Guild Text Channel
 * @prop {VoiceChannel} channel.voice Discord Guild Voice Channel
 * @prop {AudioPlayer} dispatcher Guild Audio Dispatcher
 * @prop {Array<PlayerTrack>} tracks Guild Tracks Array
 * @prop {VoiceConnection} connection Discord Guild Client Voice Connection
 * @prop {object} loop Loop object
 * @prop {boolean} loop.track Loop current track status
 * @prop {boolean} loop.queue Loop guild queue status
 * @prop {number} volume Guild queue playback volume
 * @prop {number} startStream Timestamp start playing server queue
 * @prop {GuildQueueState} state Queue playback status
 * @prop {PlayerFilter} filter Queue playback filter
 * @prop {boolean} autoplay Autoplay status of the queue
 */

/**
 * @typedef {object} LyricsData
 * 
 * @prop {string} query Search query
 * @prop {string} result Lyrics content
 * @prop {string} [title] Song title
 * @prop {string} [artist] Song artist
 * @prop {string} [source] Name of the lyrics provider
 */

/**
 * @typedef {object} PlayerFilter
 * 
 * @prop {string} name Filter name
 * @prop {string} value Filter value
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
 * @prop {Array<PlayerTrack>} data List of available tracks
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
 * @prop {object} streamTime Stream duration object
 * @prop {string | number} streamTime.days Stream duration in days
 * @prop {string | number} streamTime.hours Stream duration in hours
 * @prop {string | number} streamTime.minutes Stream duration in minutes
 * @prop {string | number} streamTime.seconds Stream duration in seconds
 */

/**
 * @typedef {object} LoopData
 * 
 * @prop {boolean} track Loop track status
 * @prop {boolean} queue Loop queue status
 */

/**
 * @typedef {object} RemoveTrackData
 * 
 * @prop {PlayerTrack} deleted Remove track object
 * @prop {Array<PlayerTrack>} tracks Updated tracks list
 */

/**
 * @typedef {object} PlayerErrorEvent
 * 
 * @prop {object} [channel] Error Channels
 * @prop {TextChannel} [channel.text] Discord Guild text Channel
 * @prop {VoiceChannel} [channel.voice] Discord Guild Voice Channel
 * @prop {User} [requested] Requested User
 * @prop {string} method Module method
 * @prop {Error} error Error object
 */

/**
 * @typedef {object} ProviderFailedEvent
 * 
 * @prop {string} provider Name of the provider that failed
 * @prop {string} method Failed method (`search`, `resolve` or `stream`)
 * @prop {Error} error Error thrown by the provider
 */

/**
 * @typedef {object} StreamOptions
 * 
 * @prop {number} [seek=0] Seek value
 * @prop {string} [filter] Filter value
 */

/***********************************************************************************************************/