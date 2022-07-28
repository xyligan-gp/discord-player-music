import { Player } from '../Player';
import { AddPlaylistData, CreatePlaylistData, ErrorData, GuildPlaylist } from '../PlayerData';

import { GuildMember, TextChannel } from 'discord.js';

export declare class PlaylistsManager {
    constructor(player: Player);

    /**
     * Player Class
     */
    private player: Player;

    /**
     * Allows you to create new playlists for the server
     * 
     * @param guildID Discord Guild ID
     * @param data Create playlist data
     * 
     * @returns Created playlist data
     */
    public create(guildID: string, data: CreatePlaylistData): Promise<GuildPlaylist>;

    /**
     * Allows you to add new tracks to playlists
     * 
     * @param guildID Discord Guild ID
     * @param data Playlist Data
     * 
     * @returns Changed playlist or object with an error
     */
    public addTrack(guildID: string, data: AddPlaylistData): Promise<GuildPlaylist & ErrorData>;

    /**
     * Allows you to play a server playlist
     * 
     * @param guildID Discord Guild ID
     * @param playlistID Guild Playlist ID
     * @param member Discord Guild Member
     * @param channel Discord Guild Text Channel
     * 
     * @returns Guild playlist data or object with an error
     */
    public play(guildID: string, playlistID: string, member: GuildMember, channel: TextChannel): Promise<GuildPlaylist & ErrorData>;

    /**
     * Allows you to delete tracks by their positions in the playlist
     * 
     * @param guildID Discord Guild ID
     * @param playlistID Guild Playlist ID
     * @param index Track index in playlist
     * 
     * @returns Changed playlist or object with an error
     */
    public removeTrack(guildID: string, playlistID: string, index?: number): Promise<GuildPlaylist & ErrorData>;

    /**
     * Allows you to delete server playlists by ID
     * 
     * @param guildID Discord Guild ID
     * @param playlistID Guild Playlist ID
     * 
     * @returns Deleted playlist or object with an error
     */
    public delete(guildID: string, playlistID: string): Promise<GuildPlaylist & ErrorData>
}