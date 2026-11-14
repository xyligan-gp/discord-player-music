import { GuildMember, TextChannel } from 'discord.js';

import type { Player } from '../Player';
import { PlayerError, PlayerErrorCode, requireParam } from '../PlayerError';
import { Events } from '../PlayerEnums';

import { AddPlaylistData, CreatePlaylistData, DatabaseStorage, GuildPlaylist } from '../types/PlayerData';

/**
 * Class that controls Player Playlists Manager
 *
 * @class
 * @classdesc Player Playlists Manager Class
 */
export class PlaylistsManager {
    private player: Player;

    /**
     * @constructor
     *
     * @param {Player} player Player Class
     *
     * @throws {PlayerError} If the player is not passed
     */
    constructor(player: Player) {
        requireParam(player, 'player', '<PlaylistsManager>');

        /**
         * Player Class
         *
         * @type {Player}
         * @private
         */
        this.player = player;
    }

    /**
     * Returns the playlists of the server
     *
     * @param {string} guildID Discord Guild ID
     * @param {boolean} [create=false] Create the storage of the server if it does not exist
     *
     * @throws {PlayerError} `GUILD_PLAYLISTS_NOT_FOUND` if the server has no playlists
     *
     * @returns {{ storage: DatabaseStorage, playlists: Array<GuildPlaylist> }} Database and playlists of the server
     * @private
     */
    private guildPlaylists(guildID: string, create: boolean = false): { storage: DatabaseStorage, playlists: Array<GuildPlaylist> } {
        if(create) this.player.database.initGuild(guildID);

        const storage = this.player.database.get();
        const playlists = storage[guildID]?.playlists;

        if(!playlists?.length && !create) throw new PlayerError(PlayerErrorCode.GUILD_PLAYLISTS_NOT_FOUND, { id: guildID });

        return { storage, playlists: playlists ?? [] };
    }

    /**
     * Finds a playlist of the server
     *
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Playlist ID
     *
     * @throws {PlayerError} `GUILD_PLAYLISTS_NOT_FOUND` or `PLAYLIST_NOT_FOUND`
     *
     * @returns {{ storage: DatabaseStorage, playlist: GuildPlaylist }} Database and playlist
     * @private
     */
    private findPlaylist(guildID: string, playlistID: string): { storage: DatabaseStorage, playlist: GuildPlaylist } {
        const { storage, playlists } = this.guildPlaylists(guildID);

        const playlist = playlists.find(item => item.id === playlistID);
        if(!playlist) throw new PlayerError(PlayerErrorCode.PLAYLIST_NOT_FOUND, { id: playlistID, guildID });

        return { storage, playlist };
    }

    /**
     * Allows you to create a new playlist on the server
     *
     * @param {string} guildID Discord Guild ID
     * @param {CreatePlaylistData} data Playlist data
     *
     * @fires Player#createdPlaylist
     *
     * @example
     * const playlistData = await client.player.playlists.create('GuildID', { title: 'My playlist', author: 'UserID', track: { url: 'https://youtube.com/watch?v=Vt2TeOptLxE', title: 'Track' } });
     *
     * console.log(playlistData);
     *
     * @throws {PlayerError} `MISSING_PARAMETER` if a parameter is missing
     *
     * @returns {Promise<GuildPlaylist>} Created playlist
     */
    public async create(guildID: string, data: CreatePlaylistData): Promise<GuildPlaylist> {
        requireParam(guildID, 'guildID', '<PlaylistsManager>.create');
        requireParam(data, 'data', '<PlaylistsManager>.create');

        const { storage, playlists } = this.guildPlaylists(guildID, true);
        const playlistID = this.player.utils.getUniqueID();

        const playlist: GuildPlaylist = {
            id: playlistID,
            title: data.title ? data.title : `Playlist #${playlistID}`,
            author: data.author,
            created: Date.now(),
            updated: null,
            duration: await this.player.utils.getTrackDuration(data.track.url),
            lastPlaying: null,
            tracks: [data.track]
        }

        playlists.push(playlist);

        this.player.database.write(storage);
        this.player.emit(Events.PLAYLIST_CREATED, playlist);

        return playlist;
    }

    /**
     * Allows you to add a track to a playlist. A new playlist is created if the server has no playlists or no playlist ID is passed.
     *
     * @param {string} guildID Discord Guild ID
     * @param {AddPlaylistData} data Track data
     *
     * @example
     * const playlistData = await client.player.playlists.addTrack('GuildID', { id: 'PlaylistID', track: { url: 'https://youtube.com/watch?v=Vt2TeOptLxE', title: 'Track' } });
     *
     * console.log(playlistData);
     *
     * @throws {PlayerError} `PLAYLIST_NOT_FOUND` if there is no such playlist, `PLAYLIST_TRACK_EXISTS` if the track is already in the playlist
     *
     * @returns {Promise<GuildPlaylist>} Updated (or newly created) playlist
     */
    public async addTrack(guildID: string, data: AddPlaylistData): Promise<GuildPlaylist> {
        requireParam(guildID, 'guildID', '<PlaylistsManager>.addTrack');
        requireParam(data, 'data', '<PlaylistsManager>.addTrack');

        const { storage, playlists } = this.guildPlaylists(guildID, true);

        if(!playlists.length || !data.id) return this.create(guildID, { author: this.player.client.user?.id ?? '', track: data.track });

        const playlist = playlists.find(item => item.id === data.id);
        if(!playlist) throw new PlayerError(PlayerErrorCode.PLAYLIST_NOT_FOUND, { id: data.id, guildID });

        if(playlist.tracks.some(track => track.url === data.track.url)) throw new PlayerError(PlayerErrorCode.PLAYLIST_TRACK_EXISTS, { url: data.track.url, id: data.id });

        playlist.updated = Date.now();
        playlist.duration += await this.player.utils.getTrackDuration(data.track.url);
        playlist.tracks.push(data.track);

        this.player.database.write(storage);

        return playlist;
    }

    /**
     * Allows you to play a playlist: all its tracks are searched and added to the queue
     *
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Playlist ID
     * @param {GuildMember} member Discord Guild Member
     * @param {TextChannel} channel Discord Guild Text Channel
     *
     * @example
     * const playlistData = await client.player.playlists.play('GuildID', 'PlaylistID', message.member, message.channel);
     *
     * console.log(playlistData);
     *
     * @throws {PlayerError} `GUILD_PLAYLISTS_NOT_FOUND` or `PLAYLIST_NOT_FOUND` if there is no such playlist, `USER_NOT_IN_VOICE` if the member is not in a voice channel
     *
     * @returns {Promise<GuildPlaylist>} Playlist
     */
    public async play(guildID: string, playlistID: string, member: GuildMember, channel: TextChannel): Promise<GuildPlaylist> {
        requireParam(guildID, 'guildID', '<PlaylistsManager>.play');
        requireParam(playlistID, 'playlistID', '<PlaylistsManager>.play');
        requireParam(member, 'member', '<PlaylistsManager>.play');
        requireParam(channel, 'channel', '<PlaylistsManager>.play');

        const { storage, playlist } = this.findPlaylist(guildID, playlistID);

        // Tracks are added one by one, so they stay in the order of the playlist
        for(const track of playlist.tracks) {
            try {
                await this.player.search(track.url, member, channel, true);
            }catch(error) {
                this.player.emit(Events.ERROR, { channel: { text: channel }, requested: member.user, method: '<PlaylistsManager>.play', error: error as Error });
            }
        }

        playlist.lastPlaying = Date.now();
        this.player.database.write(storage);

        return playlist;
    }

    /**
     * Allows you to remove a track from a playlist
     *
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Playlist ID
     * @param {number} [index=0] Track index
     *
     * @example
     * const playlistData = await client.player.playlists.removeTrack('GuildID', 'PlaylistID', 1);
     *
     * console.log(playlistData);
     *
     * @throws {PlayerError} `GUILD_PLAYLISTS_NOT_FOUND`, `PLAYLIST_NOT_FOUND` or `PLAYLIST_TRACK_NOT_FOUND`
     *
     * @returns {Promise<GuildPlaylist>} Updated playlist
     */
    public async removeTrack(guildID: string, playlistID: string, index: number = 0): Promise<GuildPlaylist> {
        requireParam(guildID, 'guildID', '<PlaylistsManager>.removeTrack');
        requireParam(playlistID, 'playlistID', '<PlaylistsManager>.removeTrack');

        const { storage, playlist } = this.findPlaylist(guildID, playlistID);

        const track = playlist.tracks[index];
        if(!track) throw new PlayerError(PlayerErrorCode.PLAYLIST_TRACK_NOT_FOUND, { index, id: playlistID });

        playlist.updated = Date.now();
        playlist.duration = Math.max(playlist.duration - await this.player.utils.getTrackDuration(track.url), 0);
        playlist.tracks.splice(index, 1);

        this.player.database.write(storage);

        return playlist;
    }

    /**
     * Allows you to delete a playlist
     *
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Playlist ID
     *
     * @fires Player#deletedPlaylist
     *
     * @example
     * const playlistData = await client.player.playlists.delete('GuildID', 'PlaylistID');
     *
     * console.log(playlistData);
     *
     * @throws {PlayerError} `GUILD_PLAYLISTS_NOT_FOUND` or `PLAYLIST_NOT_FOUND`
     *
     * @returns {Promise<GuildPlaylist>} Deleted playlist
     */
    public async delete(guildID: string, playlistID: string): Promise<GuildPlaylist> {
        requireParam(guildID, 'guildID', '<PlaylistsManager>.delete');
        requireParam(playlistID, 'playlistID', '<PlaylistsManager>.delete');

        const { storage, playlists } = this.guildPlaylists(guildID);

        const index = playlists.findIndex(item => item.id === playlistID);
        if(index < 0) throw new PlayerError(PlayerErrorCode.PLAYLIST_NOT_FOUND, { id: playlistID, guildID });

        const [playlist] = playlists.splice(index, 1);

        this.player.database.write(storage);
        this.player.emit(Events.PLAYLIST_DELETED, playlist);

        return playlist;
    }
}
