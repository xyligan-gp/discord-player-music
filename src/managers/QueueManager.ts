import { Readable } from 'node:stream';

import { Collection } from 'discord.js';
import { AudioPlayerStatus, createAudioPlayer, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';

import type { Player } from '../Player';
import { Events, GuildQueueState, Loop, Search } from '../PlayerEnums';
import { PlayerError, PlayerErrorCode, requireParam } from '../PlayerError';

import { createVolumeResource } from '../sources/AudioPipeline';
import { SourceTrack } from '../sources/SourceProvider';

import { AutoplayData, DefaultData, Filter, LoopData, PlayerFilter, PlayerQueue, PlayerTrack, ProgressData, RemoveTrackData, SkipData, StreamData } from '../types/PlayerData';

/**
 * Class that controls Player Queue Manager
 *
 * @class
 * @classdesc Player Queue Manager Class
 */
export class QueueManager {
    private player: Player;

    private storage: Collection<string, PlayerQueue>;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<QueueManager>');

        /**
         * Player Class
         *
         * @type {Player}
         * @private
         */
        this.player = player;

        /**
         * Player Queues Storage
         *
         * @type {Collection<string, PlayerQueue>}
         * @private
         */
        this.storage = new Collection();
    }

    /**
     * Number of server queues
     *
     * @type {number}
     *
     * @example
     * console.log(client.player.queue.size);
     *
     * @returns {number} Number of queues
     */
    public get size(): number {
        return this.storage.size;
    }

    /**
     * Returns the queue of the server or throws an error
     *
     * @param {string} guildID Discord Guild ID
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND`
     *
     * @returns {PlayerQueue} Server queue
     * @private
     */
    private find(guildID: string): PlayerQueue {
        const guildQueue = this.storage.get(guildID);
        if(!guildQueue) throw new PlayerError(PlayerErrorCode.QUEUE_NOT_FOUND, { id: guildID });

        return guildQueue;
    }

    /**
     * Allows you to add a track to the server queue. If the server has no queue, a new one is created and playback starts.
     *
     * @param {PlayerTrack} track Track info
     *
     * @fires Player#queueStarted
     * @fires Player#addedTrack
     *
     * @example
     * const searchData = await client.player.search('Xtrullor - Samsara', message.member, message.channel);
     * const isAdded = await client.player.queue.add(searchData[0]);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if the track is not passed
     *
     * @returns {Promise<boolean>} `true` if the track was added
     */
    public async add(track: PlayerTrack): Promise<boolean> {
        requireParam(track, 'track', '<QueueManager>.add');

        const guild = track.guild;
        const guildQueue = this.storage.get(guild.id);

        if(guildQueue) {
            guildQueue.tracks.push(track);

            this.player.emit(Events.TRACK_ADD, track);

            return true;
        }

        const connection = getVoiceConnection(guild.id) ?? joinVoiceChannel({ guildId: guild.id, channelId: track.channel.voice.id, adapterCreator: guild.voiceAdapterCreator });

        const queue: PlayerQueue = {
            channel: {
                text: track.channel.text,
                voice: track.channel.voice
            },

            dispatcher: createAudioPlayer(),
            tracks: [track],
            connection,

            loop: {
                track: false,
                queue: false
            },

            volume: this.player.options.defaultVolume,
            startStream: Date.now(),
            state: GuildQueueState.PLAYING,
            filter: { name: null, value: null },

            autoplay: this.player.options.autoplay,
            history: []
        }

        // The listeners are added once per queue (not once per track)
        queue.dispatcher.setMaxListeners(0);
        queue.dispatcher.on(AudioPlayerStatus.Idle, () => { void this.handleIdle(guild.id) });
        queue.dispatcher.on('error', error => this.handlePlayerError(guild.id, error));

        this.storage.set(guild.id, queue);

        this.player.emit(Events.QUEUE_STARTED, queue);

        void this.startTrack(guild.id, track);

        return true;
    }

    /**
     * Starts playing a track of the queue. When the track is not passed, the queue has ended and is deleted.
     * A track that can not be played is reported with the `error` event and skipped.
     *
     * @param {string} guildID Discord Guild ID
     * @param {PlayerTrack} [track] Track to play
     *
     * @fires Player#error
     * @fires Player#playingTrack
     * @fires Player#queueEnded
     *
     * @returns {Promise<void>} Resolves when the track has started (or the queue has ended)
     * @private
     */
    public async startTrack(guildID: string, track?: PlayerTrack): Promise<void> {
        const guildQueue = this.storage.get(guildID);
        if(!guildQueue) return;

        if(!track) {
            // With the autoplay the queue goes on with related tracks instead of ending
            if(await this.autoplay(guildID, guildQueue)) return;

            this.cancelPrefetch(guildQueue);

            if(guildQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) guildQueue.connection.destroy();

            this.storage.delete(guildID);

            this.player.emit(Events.QUEUE_ENDED, guildQueue, 'ended');

            return;
        }

        try {
            await this.playTrack(guildQueue, track);

            this.player.emit(Events.TRACK_PLAYING, track);
        }catch(error) {
            this.player.emit(Events.ERROR, { channel: { text: track.channel.text, voice: track.channel.voice }, requested: track.requested, method: 'initGuildTrack', error: error as Error });

            this.remember(guildQueue, track.url);

            // The connection is lost: the queue can not continue
            if(error instanceof PlayerError && error.code === PlayerErrorCode.CONNECTION_FAILED) {
                this.cancelPrefetch(guildQueue);
                this.storage.delete(guildID);

                if(guildQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) guildQueue.connection.destroy();

                this.player.emit(Events.QUEUE_ENDED, guildQueue, 'error');

                return;
            }

            // Otherwise the track is skipped
            if(guildQueue.tracks[0] === track) guildQueue.tracks.shift();

            this.player.emit(Events.TRACK_SKIPPED, { track, next: guildQueue.tracks[0] ?? null, error: error as Error });

            return this.startTrack(guildID, guildQueue.tracks[0]);
        }
    }

    /**
     * Creates an audio stream of the track and plays it (the current playback is replaced)
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @param {PlayerTrack} track Track to play
     * @param {number} [seek] Position to start from, in seconds
     *
     * @throws {PlayerError} `CONNECTION_FAILED` if the voice connection is not ready, or an error of the source providers
     *
     * @returns {Promise<void>} Resolves when the playback has started
     * @private
     */
    private async playTrack(guildQueue: PlayerQueue, track: PlayerTrack, seek?: number): Promise<void> {
        try {
            await entersState(guildQueue.connection, VoiceConnectionStatus.Ready, 5_000);
        }catch(error) {
            throw new PlayerError(PlayerErrorCode.CONNECTION_FAILED, { id: guildQueue.channel.voice.id }, error);
        }

        const filter = guildQueue.filter.value;
        const prefetched = !seek && guildQueue.prefetch?.track.url === track.url && guildQueue.prefetch.filter === filter ? guildQueue.prefetch : null;

        // The stream that was prepared in advance is used when it is the right one. It is kept when it is still the stream of the next track (seek, filter-less changes), otherwise it is dropped
        if(prefetched) guildQueue.prefetch = undefined;
        else if(!(guildQueue.prefetch && guildQueue.prefetch.track === this.nextTrack(guildQueue) && guildQueue.prefetch.filter === filter)) this.cancelPrefetch(guildQueue);

        clearTimeout(guildQueue.prefetchTimer);

        const early = prefetched ? await prefetched.stream.catch(() => null) : null;
        const opened = early ?? await this.player.sources.open(track.url, { seek, filter: filter ?? undefined });
        const resource = createVolumeResource(opened.stream);

        guildQueue.dispatcher.play(resource);

        if(!(guildQueue.connection.state as { subscription?: unknown }).subscription) guildQueue.connection.subscribe(guildQueue.dispatcher);

        resource.volume?.setVolume(guildQueue.volume / this.player.options.defaultVolume);
        if(seek) resource.playbackDuration = Math.floor(seek * 1000);

        if(guildQueue.state === GuildQueueState.PAUSED) guildQueue.dispatcher.pause();

        this.player.emit(Events.SOURCE_USED, { provider: opened.provider.name, via: opened.provider.audioProvider?.(track.url), track, seek, prefetched: early !== null });

        this.schedulePrefetch(guildQueue, track, seek ?? 0);

        guildQueue.lastPlayed = track;
        guildQueue.autoplayRounds = 0;

        this.remember(guildQueue, track.url);
    }

    /**
     * Track that is played after the current one
     *
     * @param {PlayerQueue} guildQueue Server queue
     *
     * @returns {PlayerTrack | undefined} Next track (the same track when the track loop is enabled)
     * @private
     */
    private nextTrack(guildQueue: PlayerQueue): PlayerTrack | undefined {
        if(guildQueue.loop.track) return guildQueue.tracks[0];
        if(guildQueue.loop.queue) return guildQueue.tracks[1] ?? guildQueue.tracks[0];

        return guildQueue.tracks[1];
    }

    /**
     * Plans the preparation of the next track: it starts a few seconds before the current track ends (see the `prefetchSeconds` option)
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @param {PlayerTrack} track Track that is playing
     * @param {number} position Position the track started from, in seconds
     * @private
     */
    private schedulePrefetch(guildQueue: PlayerQueue, track: PlayerTrack, position: number): void {
        const lead = this.player.options.prefetchSeconds;

        clearTimeout(guildQueue.prefetchTimer);

        if(lead <= 0) return;

        const total = Number(track.duration.hours) * 3600 + Number(track.duration.minutes) * 60 + Number(track.duration.seconds);
        const delay = total > 0 ? Math.max(0, (total - position - lead) * 1000) : 30_000;

        guildQueue.prefetchTimer = setTimeout(() => this.startPrefetch(guildQueue), delay);
        guildQueue.prefetchTimer.unref();
    }

    /**
     * Creates the stream of the next track in advance (errors are ignored here: the track is simply created again when its turn comes)
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @private
     */
    private startPrefetch(guildQueue: PlayerQueue): void {
        const next = this.nextTrack(guildQueue);

        if(!next || this.storage.get(next.guild.id) !== guildQueue) return;
        if(guildQueue.prefetch?.track.url === next.url && guildQueue.prefetch.filter === guildQueue.filter.value) return;

        this.cancelPrefetch(guildQueue);

        const stream = this.player.sources.open(next.url, { filter: guildQueue.filter.value ?? undefined });

        stream.catch(() => { });

        guildQueue.prefetch = { track: next, filter: guildQueue.filter.value, stream };
    }

    /**
     * Cancels the preparation of the next track and closes the stream that was prepared
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @private
     */
    private cancelPrefetch(guildQueue: PlayerQueue): void {
        clearTimeout(guildQueue.prefetchTimer);

        guildQueue.prefetchTimer = undefined;

        const stale = guildQueue.prefetch;

        guildQueue.prefetch = undefined;

        stale?.stream.then(opened => (opened.stream as Readable).destroy(), () => { });
    }

    /**
     * The queue was changed (tracks removed or shuffled, loop mode switched): the prepared stream may be the wrong one, so it is prepared again
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @private
     */
    private refreshPrefetch(guildQueue: PlayerQueue): void {
        if(!guildQueue.prefetch) return;

        this.cancelPrefetch(guildQueue);
        this.startPrefetch(guildQueue);
    }

    /**
     * Called when the audio player became idle: the current track has ended (or was skipped), so the next one is played
     *
     * @param {string} guildID Discord Guild ID
     *
     * @returns {Promise<void>} Resolves when the next track has started
     * @private
     */
    private async handleIdle(guildID: string): Promise<void> {
        const guildQueue = this.storage.get(guildID);
        if(!guildQueue) return;

        if(guildQueue.currentRemoved) guildQueue.currentRemoved = false;
        else if(guildQueue.loop.queue && !guildQueue.loop.track) guildQueue.tracks.push(guildQueue.tracks.shift() as PlayerTrack);
        else if(!guildQueue.loop.track) guildQueue.tracks.shift();

        return this.startTrack(guildID, guildQueue.tracks[0]);
    }

    /**
     * Called when the audio player got an error while playing (for example the stream was interrupted)
     *
     * @param {string} guildID Discord Guild ID
     * @param {Error} error Error
     *
     * @fires Player#error
     * @private
     */
    private handlePlayerError(guildID: string, error: Error): void {
        const guildQueue = this.storage.get(guildID);
        const track = guildQueue?.tracks[0];

        this.player.emit(Events.ERROR, { channel: track ? { text: track.channel.text, voice: track.channel.voice } : undefined, requested: track?.requested, method: 'initGuildTrack', error });

        // The player goes idle after an error: the failed track must not be played again
        if(guildQueue) {
            const failed = guildQueue.tracks.shift();

            guildQueue.currentRemoved = true;

            if(failed) this.player.emit(Events.TRACK_SKIPPED, { track: failed, next: guildQueue.tracks[0] ?? null, error });
        }
    }

    /**
     * Allows you to change the playback state of the server queue (pause or resume)
     *
     * @param {string} guildID Discord Guild ID
     * @param {GuildQueueState} [type] New state. If it is not passed, the paused queue is resumed.
     *
     * @fires Player#queueStateChange
     *
     * @example
     * const stateData = await client.player.queue.setState('GuildID', GuildQueueState.PAUSED);
     * if(stateData.status) return message.channel.send({ content: 'Playback has been paused!' });
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `INVALID_STATE` if the queue is already in that state
     *
     * @returns {Promise<DefaultData>} State change status
     */
    public async setState(guildID: string, type?: GuildQueueState): Promise<DefaultData> {
        requireParam(guildID, 'guildID', '<QueueManager>.setState');

        const guildQueue = this.find(guildID);
        const oldState = guildQueue.state;

        let newState: GuildQueueState | null = null;

        if(type && [GuildQueueState.PAUSED, GuildQueueState.PLAYING].includes(type)) {
            if(oldState === type) throw new PlayerError(PlayerErrorCode.INVALID_STATE, { state: type, id: guildID });

            newState = type;
        }else if(oldState === GuildQueueState.PAUSED) newState = GuildQueueState.PLAYING;

        if(newState) {
            if(newState === GuildQueueState.PAUSED) guildQueue.dispatcher.pause();
            else guildQueue.dispatcher.unpause();

            guildQueue.state = newState;

            this.player.emit(Events.QUEUE_STATE, guildQueue, oldState, newState);
        }

        return { status: guildQueue.state !== oldState };
    }

    /**
     * Allows you to get the queue of the server
     *
     * @param {string} guildID Discord Guild ID
     *
     * @example
     * const guildQueue = await client.player.queue.get('GuildID');
     *
     * console.log(guildQueue.tracks);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<PlayerQueue>} Server queue
     */
    public async get(guildID: string): Promise<PlayerQueue> {
        requireParam(guildID, 'guildID', '<QueueManager>.get');

        return this.find(guildID);
    }

    /**
     * Allows you to get the progress bar of the current track
     *
     * @param {string} guildID Discord Guild ID
     *
     * @example
     * const progressData = await client.player.queue.progress('GuildID');
     *
     * // Result: 🔘▬▬▬▬▬▬▬▬▬▬ (0%)
     * console.log(`${progressData.bar} (${progressData.percents})`);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<ProgressData>} Progress bar and percents
     */
    public async progress(guildID: string): Promise<ProgressData> {
        requireParam(guildID, 'guildID', '<QueueManager>.progress');

        const guildQueue = this.find(guildID);
        const { size, line, slider } = this.player.options.progressConfig;

        const emptyProgress: ProgressData = { bar: this.player.utils.createEmptyProgress(), percents: '0%' };

        const track = guildQueue.tracks[0];
        if(!track) return emptyProgress;

        const totalMilliseconds = (Number(track.duration.hours) * 3600 + Number(track.duration.minutes) * 60 + Number(track.duration.seconds)) * 1000;
        const playedMilliseconds = Math.floor((guildQueue.dispatcher.state as { resource?: { playbackDuration?: number } }).resource?.playbackDuration || 0);

        if(!totalMilliseconds || !playedMilliseconds) return emptyProgress;

        if(playedMilliseconds >= totalMilliseconds) return { bar: line.repeat(size + 2), percents: `${Math.floor(playedMilliseconds / totalMilliseconds * 100)}%` };

        const percentage = playedMilliseconds / totalMilliseconds;
        const progress = Math.round(size * percentage);
        const percents = Math.floor(percentage * 100);

        if(percents < 10) return { bar: emptyProgress.bar, percents: `${percents}%` };

        return { bar: line.repeat(progress).replace(/.$/, slider) + line.repeat(size - progress), percents: `${percents}%` };
    }

    /**
     * Allows you to get information about the queue playback
     *
     * @param {string} guildID Discord Guild ID
     *
     * @example
     * const streamData = await client.player.queue.streamInfo('GuildID');
     *
     * console.log(streamData);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<StreamData>} Loop, filter, state, volume and the time since the queue started
     */
    public async streamInfo(guildID: string): Promise<StreamData> {
        requireParam(guildID, 'guildID', '<QueueManager>.streamInfo');

        const guildQueue = this.find(guildID);

        return { loop: { track: guildQueue.loop.track, queue: guildQueue.loop.queue }, autoplay: guildQueue.autoplay, filter: guildQueue.filter, state: guildQueue.state, volume: guildQueue.volume, streamTime: this.player.utils.splitMilliseconds(Date.now() - guildQueue.startStream) };
    }

    /**
     * Allows you to get a track of the queue
     *
     * @param {string} guildID Discord Guild ID
     * @param {number} [index=0] Track index (the current track by default)
     *
     * @example
     * const trackData = await client.player.queue.trackInfo('GuildID', 1);
     *
     * console.log(trackData.title);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<PlayerTrack>} Track (the current one if there is no track with that index)
     */
    public async trackInfo(guildID: string, index: number = 0): Promise<PlayerTrack> {
        requireParam(guildID, 'guildID', '<QueueManager>.trackInfo');

        const guildQueue = this.find(guildID);

        return guildQueue.tracks[index] ?? guildQueue.tracks[0];
    }

    /**
     * Allows you to set a filter for the queue playback. The current track continues from the current position.
     *
     * @param {string} guildID Discord Guild ID
     * @param {Filter} [filter='clear'] Filter name
     *
     * @example
     * const filterData = await client.player.queue.setFilter('GuildID', 'bassboost');
     *
     * console.log(filterData.name);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `FILTER_NOT_FOUND` if the filter is not registered
     *
     * @returns {Promise<PlayerFilter>} Set filter
     */
    public async setFilter(guildID: string, filter: Filter | string = 'clear'): Promise<PlayerFilter> {
        requireParam(guildID, 'guildID', '<QueueManager>.setFilter');

        const guildQueue = this.find(guildID);
        const playerFilter = await this.player.filters.get(filter);

        const previousFilter = guildQueue.filter;
        guildQueue.filter = playerFilter.name?.includes('clear') ? { name: null, value: null } : playerFilter;

        try {
            const playedSeconds = Math.floor(((guildQueue.dispatcher.state as { resource?: { playbackDuration?: number } }).resource?.playbackDuration ?? 0) / 1000);

            await this.playTrack(guildQueue, guildQueue.tracks[0], playedSeconds);
        }catch(error) {
            guildQueue.filter = previousFilter;

            throw error;
        }

        return playerFilter;
    }

    /**
     * Allows you to switch the loop mode of the queue
     *
     * @param {string} guildID Discord Guild ID
     * @param {Loop} [type] Loop type (the current track by default)
     *
     * @example
     * const loopData = await client.player.queue.setLoop('GuildID', Loop.QUEUE);
     *
     * console.log(loopData);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<LoopData>} Loop status of the track and the queue
     */
    public async setLoop(guildID: string, type: Loop = Loop.TRACK): Promise<LoopData> {
        requireParam(guildID, 'guildID', '<QueueManager>.setLoop');

        const guildQueue = this.find(guildID);
        const [target, other] = type === Loop.QUEUE ? (['queue', 'track'] as const) : (['track', 'queue'] as const);

        guildQueue.loop[target] = !guildQueue.loop[target];

        // With synchronLoop enabled only one of the loop modes can be active
        if(this.player.options.synchronLoop && guildQueue.loop[target]) guildQueue.loop[other] = false;

        this.refreshPrefetch(guildQueue);

        return { track: guildQueue.loop.track, queue: guildQueue.loop.queue };
    }

    /**
     * Allows you to set the playback volume of the queue
     *
     * @param {string} guildID Discord Guild ID
     * @param {number} [value] Volume (the default volume if it is not passed)
     *
     * @example
     * const volumeData = await client.player.queue.setVolume('GuildID', 10);
     * if(volumeData.status) return message.channel.send({ content: 'Volume has been changed!' });
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `INVALID_TYPE` or `INVALID_VALUE` if the value is not a valid number
     *
     * @returns {Promise<DefaultData>} Change status
     */
    public async setVolume(guildID: string, value?: number): Promise<DefaultData> {
        requireParam(guildID, 'guildID', '<QueueManager>.setVolume');

        if(value !== undefined && typeof value !== 'number') throw new PlayerError(PlayerErrorCode.INVALID_TYPE, { value: 'value', data: 'number' });
        if(value !== undefined && (!Number.isFinite(value) || value < 0)) throw new PlayerError(PlayerErrorCode.INVALID_VALUE, { value: 'value', data: this.player.options.defaultVolume });

        const guildQueue = this.find(guildID);
        const volume = value ?? this.player.options.defaultVolume;

        guildQueue.volume = volume;
        (guildQueue.dispatcher.state as { resource?: { volume?: { setVolume(value: number): void } } }).resource?.volume?.setVolume(volume / this.player.options.defaultVolume);

        return { status: guildQueue.volume === volume };
    }

    /**
     * Allows you to skip the current track
     *
     * @param {string} guildID Discord Guild ID
     *
     * @fires Player#queueEnded
     *
     * @example
     * const skipData = await client.player.queue.skipTrack('GuildID');
     *
     * console.log(`${skipData.current.title} -> ${skipData.next?.title}`);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<SkipData>} Skipped and next track (`null` if the queue has ended)
     */
    public async skipTrack(guildID: string): Promise<SkipData> {
        requireParam(guildID, 'guildID', '<QueueManager>.skipTrack');

        const guildQueue = this.find(guildID);
        const current = guildQueue.tracks[0];

        // With the autoplay the queue goes on with related tracks after the last track is skipped
        if(guildQueue.tracks.length === 1 && this.isAutoplaying(guildQueue)) {
            guildQueue.dispatcher.stop();

            return { current, next: null };
        }

        if(guildQueue.tracks.length === 1) {
            if(guildQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) guildQueue.connection.destroy();

            this.cancelPrefetch(guildQueue);
            this.storage.delete(guildID);
            guildQueue.dispatcher.stop(true);

            this.player.emit(Events.QUEUE_ENDED, guildQueue, 'skipped');

            return { current, next: null };
        }

        if(guildQueue.loop.track) {
            // The skipped track goes to the end of the queue, the next one is played
            guildQueue.tracks.push(guildQueue.tracks.shift() as PlayerTrack);
            guildQueue.currentRemoved = true;
        }

        guildQueue.dispatcher.stop();

        return { current, next: guildQueue.loop.track ? guildQueue.tracks[0] : guildQueue.tracks[1] ?? null };
    }

    /**
     * Allows you to remove a track from the queue. Removing the current track (index 0) skips it.
     *
     * @param {string} guildID Discord Guild ID
     * @param {number} [index=0] Track index
     *
     * @example
     * const removeData = await client.player.queue.removeTrack('GuildID', 2);
     *
     * console.log(removeData.deleted.title);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `QUEUE_TRACK_NOT_FOUND` if there is no track with that index
     *
     * @returns {Promise<RemoveTrackData>} Removed track and the updated track list
     */
    public async removeTrack(guildID: string, index: number = 0): Promise<RemoveTrackData> {
        requireParam(guildID, 'guildID', '<QueueManager>.removeTrack');

        const guildQueue = this.find(guildID);

        const deleted = guildQueue.tracks[index];
        if(!deleted) throw new PlayerError(PlayerErrorCode.QUEUE_TRACK_NOT_FOUND, { index, id: guildID });

        guildQueue.tracks.splice(index, 1);

        if(index <= 1) this.refreshPrefetch(guildQueue);

        if(index === 0) {
            // The playing track was removed: the next one starts without removing anything else
            guildQueue.currentRemoved = true;
            guildQueue.dispatcher.stop();
        }

        return { deleted, tracks: guildQueue.tracks };
    }

    /**
     * Allows you to rewind the current track to the given position
     *
     * @param {string} guildID Discord Guild ID
     * @param {number} [value=5] Position in seconds
     *
     * @example
     * // Seek to the 10th second
     * const seekData = await client.player.queue.seek('GuildID', 10);
     * if(seekData.status) return message.channel.send({ content: 'The track has been rewound!' });
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `INVALID_VALUE` if the value is not a valid number
     *
     * @returns {Promise<DefaultData>} Rewind status
     */
    public async seek(guildID: string, value: number = 5): Promise<DefaultData> {
        requireParam(guildID, 'guildID', '<QueueManager>.seek');

        if(!Number.isFinite(value) || value < 0) throw new PlayerError(PlayerErrorCode.INVALID_VALUE, { value: 'value', data: 'a number of seconds >= 0' });

        const guildQueue = this.find(guildID);

        await this.playTrack(guildQueue, guildQueue.tracks[0], value);

        return { status: true };
    }

    /**
     * Allows you to shuffle the tracks of the queue (the current track stays in place)
     *
     * @param {string} guildID Discord Guild ID
     *
     * @example
     * const shuffleData = await client.player.queue.shuffle('GuildID');
     *
     * console.log(shuffleData.map(track => track.title));
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `SHUFFLE_UNAVAILABLE` if there are less than 3 tracks
     *
     * @returns {Promise<Array<PlayerTrack>>} Shuffled track list
     */
    public async shuffle(guildID: string): Promise<Array<PlayerTrack>> {
        requireParam(guildID, 'guildID', '<QueueManager>.shuffle');

        const guildQueue = this.find(guildID);
        if(guildQueue.tracks.length <= 2) throw new PlayerError(PlayerErrorCode.SHUFFLE_UNAVAILABLE);

        const current = guildQueue.tracks.shift() as PlayerTrack;

        for(let i = guildQueue.tracks.length - 1; i > 0; i--) {
            const index = Math.floor(Math.random() * (i + 1));

            [guildQueue.tracks[i], guildQueue.tracks[index]] = [guildQueue.tracks[index], guildQueue.tracks[i]];
        }

        guildQueue.tracks.unshift(current);

        this.refreshPrefetch(guildQueue);

        return guildQueue.tracks;
    }

    /**
     * Allows you to stop the playback: the bot leaves the voice channel and the queue is deleted
     *
     * @param {string} guildID Discord Guild ID
     *
     * @fires Player#queueEnded
     *
     * @example
     * const stopData = await client.player.queue.stop('GuildID');
     * if(stopData.status) return message.channel.send({ content: 'Playback has been stopped!' });
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<DefaultData>} Deletion status
     */
    public async stop(guildID: string): Promise<DefaultData> {
        requireParam(guildID, 'guildID', '<QueueManager>.stop');

        const guildQueue = this.find(guildID);

        this.cancelPrefetch(guildQueue);
        this.storage.delete(guildID);
        guildQueue.dispatcher.stop(true);

        if(guildQueue.connection.state.status !== VoiceConnectionStatus.Destroyed) guildQueue.connection.destroy();

        this.player.emit(Events.QUEUE_ENDED, guildQueue, 'stopped');

        return { status: true };
    }

    /**
     * Allows you to delete the queue of the server without leaving the voice channel
     *
     * @param {string} guildID Discord Guild ID
     *
     * @fires Player#queueEnded
     *
     * @example
     * const deleteData = await client.player.queue.delete('GuildID');
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue
     *
     * @returns {Promise<DefaultData>} Deletion status
     */
    public async delete(guildID: string): Promise<DefaultData> {
        requireParam(guildID, 'guildID', '<QueueManager>.delete');

        const guildQueue = this.find(guildID);

        this.cancelPrefetch(guildQueue);
        this.storage.delete(guildID);
        guildQueue.dispatcher.stop(true);

        this.player.emit(Events.QUEUE_ENDED, guildQueue, 'deleted');

        return { status: true };
    }

    /**
     * Allows you to turn the autoplay of the server queue on or off. With the autoplay, when the tracks are over (and no loop is on, and after the last
     * track is skipped or removed), the module finds tracks related to the track that played last, adds them to the queue and plays them, again and again,
     * until the autoplay is turned off or the queue is stopped. Without it the queue ends (`queueEnded` with the reason `ended`).
     *
     * @param {string} guildID Discord Guild ID
     * @param {boolean} [enabled] New status (the status is switched when it is not passed)
     *
     * @fires Player#autoplayAdded
     *
     * @example
     * const autoplayData = await client.player.queue.setAutoplay('GuildID', true);
     *
     * console.log(autoplayData.autoplay);
     *
     * @throws {PlayerError} `QUEUE_NOT_FOUND` if the server has no queue, `INVALID_TYPE` if `enabled` is not a boolean
     *
     * @returns {Promise<AutoplayData>} Autoplay status of the queue
     */
    public async setAutoplay(guildID: string, enabled?: boolean): Promise<AutoplayData> {
        requireParam(guildID, 'guildID', '<QueueManager>.setAutoplay');

        if(enabled !== undefined && typeof enabled !== 'boolean') throw new PlayerError(PlayerErrorCode.INVALID_TYPE, { value: 'enabled', data: 'boolean' });

        const guildQueue = this.find(guildID);

        guildQueue.autoplay = enabled ?? !guildQueue.autoplay;

        return { autoplay: guildQueue.autoplay };
    }

    /**
     * Checks that the autoplay may add tracks now: it is on and neither the track loop nor the queue loop is on
     *
     * @param {PlayerQueue} guildQueue Server queue
     *
     * @returns {boolean} `true` if the autoplay works for the queue
     * @private
     */
    private isAutoplaying(guildQueue: PlayerQueue): boolean {
        return guildQueue.autoplay && !guildQueue.loop.track && !guildQueue.loop.queue;
    }

    /**
     * Remembers a played (or failed) track, so the autoplay does not add it again. The oldest tracks are forgotten (see `autoplayHistory`).
     *
     * @param {PlayerQueue} guildQueue Server queue
     * @param {string} url Track URL
     * @private
     */
    private remember(guildQueue: PlayerQueue, url: string): void {
        const history = guildQueue.history ??= [];
        const index = history.indexOf(url);

        if(index >= 0) history.splice(index, 1);

        history.push(url);

        while(history.length > this.player.options.autoplayHistory) history.shift();
    }

    /**
     * Autoplay: when the queue has no more tracks, it looks for tracks related to the track that played last, adds them and goes on playing.
     * Nothing is added (and the queue ends) when the autoplay is off, a loop is on, nothing suitable was found or the lookup failed (`error` event).
     * Live streams, tracks longer than `autoplayMaxDuration` and the tracks that already played are skipped.
     *
     * @param {string} guildID Discord Guild ID
     * @param {PlayerQueue} guildQueue Server queue
     *
     * @fires Player#autoplayAdded
     * @fires Player#error
     *
     * @returns {Promise<boolean>} `true` if the queue must not be closed (the playback went on, or the queue was closed meanwhile)
     * @private
     */
    private async autoplay(guildID: string, guildQueue: PlayerQueue): Promise<boolean> {
        const seed = guildQueue.lastPlayed;

        if(!seed || guildQueue.autoplaying || !this.isAutoplaying(guildQueue)) return false;

        // The counter is reset when a track plays: a limit stops an endless chain of tracks that can not be played
        guildQueue.autoplayRounds = (guildQueue.autoplayRounds ?? 0) + 1;

        if(guildQueue.autoplayRounds > 3) return false;

        const { options } = this.player;
        let related: Array<SourceTrack>;

        guildQueue.autoplaying = true;

        try {
            const exclude = [...(guildQueue.history ?? []), seed.url, ...guildQueue.tracks.map(track => track.url)];

            // More tracks than needed are asked for, some of them are skipped below (live streams, too long tracks)
            related = await this.player.sources.related(this.toSourceTrack(seed), { limit: options.autoplayLimit * 4, exclude });
        }catch(error) {
            guildQueue.autoplaying = false;

            this.player.emit(Events.ERROR, { channel: { text: seed.channel.text, voice: seed.channel.voice }, requested: seed.requested, method: 'autoplay', error: error as Error });

            return false;
        }

        guildQueue.autoplaying = false;

        // The queue was stopped or deleted while the tracks were searched
        if(this.storage.get(guildID) !== guildQueue) return true;

        // A track was added meanwhile: it is played, the autoplay works at the next end
        if(guildQueue.tracks.length) {
            await this.startTrack(guildID, guildQueue.tracks[0]);

            return true;
        }

        // The autoplay was turned off (or a loop was switched on) meanwhile
        if(!this.isAutoplaying(guildQueue)) return false;

        const maxSeconds = this.player.utils.parseDuration(options.autoplayMaxDuration) / 1000;
        const seedSeconds = this.toSourceTrack(seed).seconds;
        const suitable = related.filter(track => track.seconds > 0 && track.seconds <= maxSeconds && !track.url.includes('/shorts/'));

        // The feed of related videos is mixed (news, long mixes, children's videos), so the tracks of a similar length go first (the order of the feed is kept)
        const similar = (track: SourceTrack) => seedSeconds > 0 && track.seconds >= seedSeconds * 0.3 && track.seconds <= seedSeconds * 3;
        const tracks = [...suitable.filter(similar), ...suitable.filter(track => !similar(track))]
            .slice(0, options.autoplayLimit)
            .map(track => this.createAutoplayTrack(track, seed));

        if(!tracks.length) return false;

        guildQueue.tracks.push(...tracks);

        this.player.emit(Events.AUTOPLAY_ADDED, guildQueue, tracks);

        await this.startTrack(guildID, guildQueue.tracks[0]);

        return true;
    }

    /**
     * Converts a track of the queue to the track of a source provider (the providers use its `url`)
     *
     * @param {PlayerTrack} track Track of the queue
     *
     * @returns {SourceTrack} Track of a source provider
     * @private
     */
    private toSourceTrack(track: PlayerTrack): SourceTrack {
        const { hours, minutes, seconds } = track.duration;

        return {
            id: track.url,
            title: track.title,
            url: track.url,
            thumbnail: track.thumbnail,
            seconds: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds),
            author: { name: track.author.name, url: track.author.url },
            source: track.source ?? ''
        }
    }

    /**
     * Creates a track of the queue from a related track: the requester and the channels are the ones of the track that played before
     *
     * @param {SourceTrack} item Related track
     * @param {PlayerTrack} seed Track that played before
     *
     * @returns {PlayerTrack} Track of the queue
     * @private
     */
    private createAutoplayTrack(item: SourceTrack, seed: PlayerTrack): PlayerTrack {
        const [hours, minutes, seconds] = this.player.utils.formatnumbers([Math.floor(item.seconds / 3600), Math.floor(item.seconds / 60 % 60), Math.floor(item.seconds % 60)]);

        return {
            searchType: Search.AUTOPLAY,
            title: item.title,
            url: item.url,
            thumbnail: item.thumbnail,

            author: {
                name: item.author.name,
                url: item.author.url
            },

            channel: {
                text: seed.channel.text,
                voice: seed.channel.voice
            },

            guild: seed.guild,
            requested: seed.requested,

            duration: { hours, minutes, seconds },
            source: item.source
        }
    }
}
