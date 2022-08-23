import { Player } from '../Player';
import { Events, GuildQueueState, Loop, ProgressType } from '../PlayerEnums';

import { Collection } from 'discord.js';
import { createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, StreamType, VoiceConnectionStatus } from '@discordjs/voice';

import errors from '../data/errors.json';

import { PlayerError } from '../PlayerError';

import { PlayerTrack, PlayerQueue, ErrorData, PlayerFilter, SkipData, ProgressData, StreamData, DefaultData, Filter, LoopData, RemoveTrackData } from '../../types/PlayerData';

import ytdl from '../modules/dpm-ytdl';

const parse = ms => ({
    days: Math.floor(ms / 86400000),
    hours: Math.floor(ms / 3600000 % 24),
    minutes: Math.floor(ms / 60000 % 60),
    seconds: Math.floor(ms / 1000 % 60)
});

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
     */
    constructor(player: Player) {
        if(!player) throw new PlayerError(errors.default.requireParam.replace('{param}', 'player').replace('{data}', '<QueueManager>'));

        /**
         * Player Class
         * 
         * @type {Player}
         * @private
         */
        this.player = player;

        /**
         * Player Queue Storage
         * 
         * @type {Collection<string, PlayerQueue>}
         * @private
         */
        this.storage = new Collection();
    }

    /**
     * Allows you to get the number of server queues that are in storage
     * 
     * @type {number}
     * 
     * @returns {number} Player queue storage size
     */
    public get size(): number {
        return this.storage.size;
    }

    /**
     * Allows you to add tracks to the server queue
     * 
     * @param {PlayerTrack} track Track info
     * 
     * @fires Player#addedTrack
     * @fires Player#queueStarted
     * 
     * @example
     * const searchData = client.player.search('Xtrullor - Samsara', message.member, message.channel);
     * if(searchData[0]?.title) client.player.queue.add(searchData[0]);
     * 
     * @returns {Promise<boolean>} Status of adding a track to the server queue
     */
    public add(track: PlayerTrack): Promise<boolean> {
        return new Promise(async (res, rej) => {
            if(!track) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'track').replace('{data}', '<QueueManager>.add'));
            
            const guild = track.guild;

            let guildConnection = getVoiceConnection(guild.id);
            if(!guildConnection) guildConnection = joinVoiceChannel({ guildId: guild.id, channelId: track.channel.voice.id, adapterCreator: guild.voiceAdapterCreator });

            const guildQueue = this.storage.get(guild.id);

            if(!guildQueue) {
                const queueobject: PlayerQueue = {
                    channel: {
                        text: track.channel.text,
                        voice: track.channel.voice
                    },

                    dispatcher: createAudioPlayer(),
                    tracks: [track],
                    connection: guildConnection,

                    loop: {
                        track: false,
                        queue: false
                    },

                    volume: this.player.options.defaultVolume,
                    startStream: Date.now(),
                    state: GuildQueueState.PLAYING,
                    filter: { name: null, value: null }
                }

                this.storage.set(guild.id, queueobject);
                
                this.player.emit(Events.QUEUE_STARTED, this.storage.get(guild.id));

                this.player.initGuildTrack(guild.id, track);

                return res(this.storage.get(guild.id) != null);
            }else{
                guildQueue.tracks.push(track);

                this.player.emit(Events.TRACK_ADD, track);

                return res(this.storage.get(guild.id)?.tracks.find(guildTrack => guildTrack.url === track.url) != null);
            }
        })
    }

    /**
     * Allows you to set the state of the server queue (pause and resume)
     * 
     * @param {string} guildID Discord Guild ID
     * @param {GuildQueueState} type State type
     * 
     * @fires Player#queueStateChange
     * 
     * @example
     * // Pause command
     * const setStateData = await client.player.queue.setState('GuildID', GuildQueueState.PAUSE);
     * 
     * // Resume command
     * const setStateData = await client.player.queue.setState('GuildID', GuildQueueState.PLAYING);
     * 
     * console.log(setStateData);
     * 
     * @returns {Promise<DefaultData | ErrorData>} Installation status or object with an error
     */
    public setState(guildID: string, type?: GuildQueueState): Promise<DefaultData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.setState'));
            
            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            const oldState = guildQueue.state;

            if(type && [GuildQueueState.PAUSED, GuildQueueState.PLAYING].includes(type)) {
                const newState = type;

                if(guildQueue.state.includes(newState)) return res({ error: { code: 404, message: this.player.errors.other.unknownState.replace('{state}', newState).replace('{id}', guildID) } });

                if(newState.includes(GuildQueueState.PAUSED)) guildQueue.dispatcher.pause();
                else guildQueue.dispatcher.unpause();

                guildQueue.state = newState;

                this.player.emit(Events.QUEUE_STATE, guildQueue, oldState, newState);
            }else{
                if(guildQueue.state.includes(GuildQueueState.PAUSED)) {
                    const newState = GuildQueueState.PLAYING;

                    guildQueue.dispatcher.unpause();

                    guildQueue.state = newState;

                    this.player.emit(Events.QUEUE_STATE, guildQueue, oldState, newState);
                }
            }

            return res({ status: !guildQueue.state.includes(oldState) });
        })
    }

    /**
     * Allows you to get the queue object for the server
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const guildQueue = await client.player.queue.get('GuildID');
     * if(guildQueue?.tracks) return message.channel.send({ content: `${guildQueue.tracks.length} tracks found in server queue!` });
     * 
     * @returns {Promise<PlayerQueue | ErrorData>} Queue object for server or `null`
     */
    public get(guildID: string): Promise<PlayerQueue | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.get'));
            
            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            return res(guildQueue);
        })
    }

    /**
     * Allows you to create a progress bar for playing the current track in the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const progressData = await client.player.queue.pregress('GuildID');
     * if(progressData?.bar) return message.channel.send({ content: `[${progressData.percents}] ${progressData.bar}` });
     * 
     * @returns {ProgressData<ProgressData | ErrorData>} Progress bar data or an object with an error
     */
    public progress(guildID: string): Promise<ProgressData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.progress'));
            
            const guildQueue = await this.get(guildID);
            if('error' in guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });
            
            const emptyProgress = this.player.utils.createProgress();
            const fullProgress = this.player.utils.createProgress(ProgressType.FULL);

            if(!guildQueue.dispatcher) return res({ bar: emptyProgress, percents: '0%' });

            const track = guildQueue.tracks[0];
            if(!track) return res({ bar: emptyProgress, percents: '0%' });

            const trackDuration = Math.floor((Number(track.duration.hours) * 3600) + (Number(track.duration.minutes) * 60) + Number(track.duration.seconds));
            const totalSeconds = Math.floor(trackDuration * 1000);
            const alreadyPlayedSeconds = Math.floor((guildQueue.dispatcher.state as any).resource.playbackDuration || 0);

            if(isNaN(this.player.options.progressConfig.size)) return res({ bar: emptyProgress, percents: '0%' });

            if(!totalSeconds) return res({ bar: emptyProgress, percents: '0%' });
            if(isNaN(totalSeconds)) return res({ bar: emptyProgress, percents: '0%' });

            if(!alreadyPlayedSeconds) return res({ bar: emptyProgress, percents: '0%' });
            if(isNaN(alreadyPlayedSeconds)) return res({ bar: emptyProgress, percents: '0%' });

            if(alreadyPlayedSeconds < totalSeconds) {
                const percentage = alreadyPlayedSeconds / totalSeconds;
                const progress = Math.round(this.player.options.progressConfig.size * percentage);
                const empty = this.player.options.progressConfig.size - progress;
                const progressBar = this.player.options.progressConfig.line.repeat(progress).replace(/.$/, this.player.options.progressConfig.slider);
                const emptyProgressBar = this.player.options.progressConfig.line.repeat(empty);
                const percents = Math.floor(percentage * 100);

                if(percents < 10) return res({ bar: emptyProgress, percents: `${percents}%` });
                else if(percents >= 100) return res({ bar: fullProgress, percents: `100%` });
                else return res({ bar: progressBar + emptyProgressBar, percents: `${percents}%` });
            }else return res({ bar: this.player.options.progressConfig.line.repeat(this.player.options.progressConfig.size + 2), percents: `${(alreadyPlayedSeconds / totalSeconds) * 100}%` });
        })
    }

    /**
     * Allows you to find out information about the current stream
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const streamData = await client.player.queue.streamInfo('GuildID');
     * if(streamData?.state) return message.channel.send({ content: `Stream filter: ${streamData.filter.name}\nStream state: ${streamData.state.includes(GuildQueueState.PLAYING) ? '▶️' : '⏸️'}` });
     * 
     * @returns {Promise<StreamData | ErrorData>} General information about the current stream
     */
    public streamInfo(guildID: string): Promise<StreamData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.dispatcherInfo'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            const streamTime = parse(Date.now() - guildQueue.startStream);

            return res({ loop: { track: guildQueue.loop.track, queue: guildQueue.loop.queue }, filter: guildQueue.filter, state: guildQueue.state, volume: guildQueue.volume, streamTime: streamTime });
        })
    }

    /**
     * Allows you to get an object with information about the track
     * 
     * @param {string} guildID Discord Guild ID
     * @param {number} index Track index
     * 
     * @example
     * const trackData = await client.player.queue.trackInfo('GuildID', 0);
     * if(trackData?.title) return message.channel.send({ content: `Track title: ${trackData.title}\ntrack URL: ${trackData.url}` });
     * 
     * @returns {Promise<PlayerTrack | ErrorData>} object with track information or with an error
     */
    public trackInfo(guildID: string, index?: number): Promise<PlayerTrack | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.trackInfo'));
            if(!index) index = 0;

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });
            
            const guildTracks = guildQueue.tracks;

            return res(guildTracks.indexOf(guildTracks[index]) == -1 ? guildTracks[0] : guildTracks[index]);
        })
    }

    /**
     * Allows you to set a playback filter for the queue
     * 
     * @param {string} guildID Discord Guild ID
     * @param {Filter} filter Filter type
     * 
     * @example
     * const setFilterData = await client.player.queue.setFilter('GuildID', 'nightcore');
     * if(setFilterData?.name) return message.channel.send({ content: `Filter '${setFilterData.name}' successfully installed!` });
     * 
     * @returns {Promise<PlayerFilter | ErrorData>} Set filter data or an object with an error
     */
    public setFilter(guildID: string, filter?: Filter): Promise<PlayerFilter | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.setFilter'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            const playerFilter = await this.player.filters.get(filter || 'clear');
            if('error' in playerFilter) return res({ error: { code: 404, message: this.player.errors.filters.notFound.replace('{name}', filter || 'clear') } });

            guildQueue.filter = playerFilter.name.includes('clear') ? { name: null, value: null } : playerFilter;

            const stream = await ytdl(guildQueue.tracks[0].url, { filter: guildQueue.filter.value });
            const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });

            guildQueue.dispatcher.play(resource);

            return res(playerFilter);
        })
    }

    /**
     * Allows you to set the looping of a queue or a single track
     * 
     * @param {string} guildID Discord Guild ID
     * @param {Loop} type Loop type
     * 
     * @example
     * // Loop only first track
     * const setLoopData = await client.player.queue.setLoop('GuildID', Loop.TRACK);
     * 
     * // Loop all queue tracks
     * const setLoopData = await client.player.queue.setLoop('GuildID', Loop.QUEUE);
     * 
     * console.log(setLoopData);
     * 
     * @returns {Promise<LoopData | ErrorData>} Loop setup status or object in error
     */
    public setLoop(guildID: string, type?: Loop): Promise<LoopData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.setLoop'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            if(type) {
                switch(type) {
                    case Loop.QUEUE: {
                        if(this.player.options.synchronLoop) {
                            guildQueue.loop.queue = !guildQueue.loop.queue;
                            if(guildQueue.loop.track) guildQueue.loop.track = !guildQueue.loop.track;
                        }else guildQueue.loop.queue = !guildQueue.loop.queue;

                        return res({ track: guildQueue.loop.track, queue: guildQueue.loop.queue });
                    }
    
                    case Loop.TRACK: {
                        if(this.player.options.synchronLoop) {
                            guildQueue.loop.track = !guildQueue.loop.track;
                            if(guildQueue.loop.queue) guildQueue.loop.queue = !guildQueue.loop.queue;
                        }else guildQueue.loop.track = !guildQueue.loop.track;
                        
                        return res({ track: guildQueue.loop.track, queue: guildQueue.loop.queue });
                    }
                }
            }else{
                if(this.player.options.synchronLoop) {
                    guildQueue.loop.track = !guildQueue.loop.track;
                    if(guildQueue.loop.queue) guildQueue.loop.queue = !guildQueue.loop.queue;
                }else guildQueue.loop.track = !guildQueue.loop.track;

                return res({ track: guildQueue.loop.track, queue: guildQueue.loop.queue });
            }
        })
    }

    /**
     * Allows you to set the playback volume of the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * @param {number} [value=5] Volume value
     * 
     * @example
     * const setVolumeData = await client.player.queue.setVolume('GuildID', 10);
     * if(setVolumeData?.status) return message.channel.send({ content: `Volume playback successfully installed on 10!` });
     * 
     * @returns {Promise<DefaultData | ErrorData>} Server queue playback volume change status or object with an error
     */
    public setVolume(guildID: string, value?: number): Promise<DefaultData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.setVolume'));

            if(value && typeof value != 'number') throw new PlayerError(this.player.errors.default.invalidType.replace('{value}', 'value').replace('{data}', 'number'));
            if(value && isNaN(value)) throw new PlayerError(this.player.errors.default.invalidValue.replace('{value}', 'value').replace('{data}', this.player.options.defaultVolume.toString()));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            guildQueue.volume = value || this.player.options.defaultVolume;
            (guildQueue.dispatcher.state as any).resource?.volume.setVolume(value / this.player.options.defaultVolume);

            return res({ status: guildQueue.volume === (value || this.player.options.defaultVolume) });
        })
    }

    /**
     * Allows you to skip server tracks
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const skipData = await client.player.queue.skipTrack('GuildID');
     * if(skipData?.next) return message.channel.send({ content: `Skip track '${skipData.current}' and start playing track '${skipData.next}'!` });
     * 
     * @returns {Promise<SkipData | ErrorData>} Object with current and next track or error
     */
    public skipTrack(guildID: string): Promise<SkipData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.skipTrack'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            if(guildQueue.tracks.length === 1) {
                if(guildQueue.connection.state.status != VoiceConnectionStatus.Destroyed) {
                    guildQueue.connection.destroy();

                    this.storage.delete(guildID);
                }else this.storage.delete(guildID);

                return res({ current: guildQueue.tracks[0], next: null });
            }

            if(guildQueue.loop.track) {
                const track = guildQueue.tracks.shift();

                guildQueue.tracks.push(track);
                guildQueue.dispatcher.stop();

                return res({ current: track, next: guildQueue.tracks[0] });
            }

            if(guildQueue.loop.queue) guildQueue.dispatcher.stop();

            guildQueue.dispatcher.stop();

            return res({ current: guildQueue.tracks[0] || null, next: guildQueue.tracks[1] || null });
        })
    }

    /**
     * Allows you to delete tracks by index in the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * @param {number} index Track index
     * 
     * @example
     * const removeTrackData = await client.player.queue.removetrack('GuildID', 0);
     * if(!removeTrackData?.error) return message.channel.send({ content: `Track with index 1 deleted from server queue!` });
     * 
     * @returns {Promise<RemoveTrackData | ErrorData>} Updated track list for the server or an object with an error
     */
    public removeTrack(guildID: string, index?: number): Promise<RemoveTrackData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.removeTrack'));
            if(!index) index = 0;

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            const guildTracks = guildQueue.tracks;
            if(guildTracks.indexOf(guildTracks[index]) == -1) return res({ error: { code: 404, message: this.player.errors.other.unknownGuildTrack.replace('{index}', index.toString()).replace('{id}', guildID) } });

            const guildTrack = guildTracks[index];

            guildTracks.splice(index, 1);

            return res({ deleted: guildTrack, tracks: guildTracks });
        })
    }

    /**
     * Allows you to rewind the current track in the queue
     * 
     * @param {string} guildID Discord Guild ID
     * @param {number} [value=5] Seek value
     * 
     * @example
     * // Seek 10 seconds
     * const seekData = await client.player.queue.seek('GuildID', 10);
     * if(seekData?.status) return message.channel.send({ content: `The track has been successfully rewound by 10 seconds!` });
     * 
     * @returns {Promise<DefaultData | ErrorData>} Installation status or object with an error
     */
    public seek(guildID: string, value?: number): Promise<DefaultData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.seek'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            const stream = await ytdl(guildQueue.tracks[0].url, { seek: value, filter: guildQueue.filter.value });
            const resource = createAudioResource(stream, { inputType: StreamType.OggOpus, inlineVolume: true });

            guildQueue.dispatcher.play(resource);

            (guildQueue.dispatcher.state as any).resource.playbackDuration = Math.floor(value * 1000);
            (guildQueue.dispatcher.state as any).resource.volume.setVolume(guildQueue.volume / this.player.options.defaultVolume);

            return res({ status: (guildQueue.dispatcher.state as any).resource.playbackDuration >= Math.floor(value * 1000) });
        })
    }

    /**
     * Allows you to shuffle tracks in the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const shuffleData = await client.player.queue.shuffle('GuildID');
     * if(!shuffleData?.error) return message.channel.send({ content: `10 tracks successfully shuffled!` });
     * 
     * @returns {Promise<Array<PlayerTrack> | ErrorData>} Shuffled list of tracks in the queue
     */
    public shuffle(guildID: string): Promise<Array<PlayerTrack> | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.shuffle'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', this.player.client.user.id) } });
            if(guildQueue.tracks.length <= 2) return res({ error: { code: 403, message: this.player.errors.other.shuffleInfo } });

            const track = guildQueue.tracks.shift();

            for(let i = guildQueue.tracks.length - 1; i > 0; i--) {
                const index = Math.floor(Math.random() * (i + 1));
                [guildQueue.tracks[i], guildQueue.tracks[index]] = [guildQueue.tracks[index], guildQueue.tracks[i]];
            }

            guildQueue.tracks.unshift(track);

            return res(guildQueue.tracks);
        })
    }

    /**
     * Allows you to end playback of the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const stopData = await client.player.queue.stop('GuildID');
     * if(stopData?.status) return message.channel.send({ content: `Server queue playback successfully stopped!` });
     * 
     * @returns {Promise<DefaultData | ErrorData>} Presence of a queue for a server in storage or an object with an error
     */
    public stop(guildID: string): Promise<DefaultData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.stop'));

            const guildQueue = this.storage.get(guildID);
            if(!guildQueue) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            if(guildQueue.connection.state.status != VoiceConnectionStatus.Destroyed) guildQueue.connection.destroy();

            return res({ status: this.storage.delete(guildID) });
        })
    }

    /**
     * Allows you to clear the server queue
     * 
     * @param {string} guildID Discord Guild ID
     * 
     * @example
     * const deleteData = client.player.queue.delete('GuildID');
     * if(deleteData?.status) return message.channel.send({ content: `The server queue has been successfully removed from the storage!` });
     * 
     * @returns {Promise<DefaultData | ErrorData>} Server queue cleanup status or object with an error
     */
    public delete(guildID: string): Promise<DefaultData | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<QueueManager>.clear'));

            if(!this.storage.get(guildID)) return res({ error: { code: 404, message: this.player.errors.default.missingQueue.replace('{id}', guildID) } });

            return res({ status: this.storage.delete(guildID) });
        })
    }
}