import { Player, GuildQueueState, Loop } from '../Player';

import { DefaultData, ErrorData, Filter, LoopData, PlayerFilter, PlayerQueue, PlayerTrack, ProgressData, SkipData, StreamData } from '../PlayerData';

import { Collection } from 'discord.js';

export declare class QueueManager {
    constructor(player: Player);

    /**
     * Player Class
     */
    private player: Player;

    /**
     * Player Queue Storage
     */
    private storage: Collection<string, PlayerQueue>;

    /**
     * Allows you to get the number of server queues that are in storage
     */
    get size(): number;

    /**
     * Allows you to add tracks to the server queue
     * 
     * @param track Track info
     * 
     * @returns Status of adding a track to the server queue
     */
    public add(track: PlayerTrack): Promise<boolean>;

    /**
     * Allows you to get the queue object for the server
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Queue object for server or `null`
     */
    public get(guildID: string): Promise<PlayerQueue & ErrorData>;

    /**
     * Allows you to create a progress bar for playing the current track in the server queue
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Progress bar data or an object with an error
     */
    public progress(guildID: string): Promise<ProgressData & ErrorData>

    /**
     * Allows you to find out information about the current stream
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns General information about the current stream
     */
    public streamInfo(guildID: string): Promise<StreamData & ErrorData>;
    
    /**
     * Allows you to get an object with information about the track
     * 
     * @param guildID Discord Guild ID
     * @param index Track index
     * 
     * @returns Object with track information or with an error
     */
    public trackInfo(guildID: string, index?: number): Promise<PlayerTrack & ErrorData>;
    
    /**
     * Allows you to set a playback filter for the queue
     * 
     * @param guildID Discord Guild ID
     * @param filter Filter type
     * 
     * @returns Set filter data or an object with an error
     */
    public setFilter(guildID: string, filter?: Filter): Promise<PlayerFilter & ErrorData>;

    /**
     * Allows you to set the looping of a queue or a single track
     * 
     * @param guildID Discord Guild ID
     * @param type Loop type
     * 
     * @returns Loop setup status or object in error
     */
    public setLoop(guildID: string, type?: Loop): Promise<LoopData & ErrorData>;

    /**
     * Allows you to set the state of the server queue (pause and resume)
     * 
     * @param guildID Discord Guild ID
     * @param type State type
     * 
     * @returns Installation status or object with an error
     */
    public setState(guildID: string, type?: GuildQueueState): Promise<DefaultData & ErrorData>;

    /**
     * Allows you to set the playback volume of the server queue
     * 
     * @param guildID Discord Guild ID
     * @param value Volume value
     * 
     * @returns Server Queue Playback Volume Change Status
     */
    public setVolume(guildID: string, value?: number): Promise<DefaultData & ErrorData>;

    /**
     * Allows you to skip server tracks
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Object with current and next track or error
     */
    public skipTrack(guildID: string): Promise<SkipData & ErrorData>;

    /**
     * Allows you to delete tracks by index in the server queue
     * 
     * @param guildID Discord Guild ID
     * @param index Track index
     * 
     * @returns Updated track list for the server or an object with an error
     */
    public removeTrack(guildID: string, index?: number): Promise<Array<PlayerTrack> & ErrorData>;

    /**
     * Allows you to rewind the current track in the queue
     * 
     * @param guildID Discord Guild ID
     * @param value Seek value
     * 
     * @returns Installation status or object with an error
     */
    public seek(guildID: string, value?: number): Promise<DefaultData & ErrorData>;

    /**
     * Allows you to shuffle tracks in the server queue
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Shuffled list of tracks in the queue
     */
    public shuffle(guildID: string): Promise<Array<PlayerTrack> & ErrorData>;

    /**
     * Allows you to end playback of the server queue
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Presence of a queue for a server in storage or an object with an error
     */
    public stop(guildID: string): Promise<DefaultData & ErrorData>;

    /**
     * Allows you to clear the server queue
     * 
     * @param guildID Discord Guild ID
     * 
     * @returns Server queue cleanup status
     */
    public delete(guildID: string): Promise<DefaultData & ErrorData>
}