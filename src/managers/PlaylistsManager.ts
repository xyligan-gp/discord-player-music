import { GuildMember, TextChannel } from 'discord.js';

import { Player } from '../Player';
import { PlayerError } from '../PlayerError';

import { AddPlaylistData, CreatePlaylistData, ErrorData, GuildPlaylist } from '../../types/PlayerData';

import errors from '../data/errors.json';
import { Events } from '../PlayerEnums';

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
     */
    constructor(player: Player) {
        if(!player) throw new PlayerError(errors.default.requireParam.replace('{param}', 'player').replace('{data}', '<PlaylistsManager>'));

        /**
         * Player Class
         * 
         * @type {Player}
         * @private
         */
        this.player = player;
    }

    /**
     * Allows you to create new playlists for the server
     * 
     * @param {string} guildID Discord Guild ID
     * @param {CreatePlaylistData} data Create playlist data
     * 
     * @fires Player#createdPlaylist
     * 
     * @example
     * const createPlaylistData = await client.player.playlists.create('GuildID', {
     *      title: 'Test Playlist #1',
     *      author: 'UserID',
     * 
     *      track: {
     *          title: 'Xtrullor - Samsara',
     *          url: 'https://youtube.com/watch?v=Vt2TeOptLxE'
     *      }
     * })
     * 
     * if(createPlaylistData?.title) return message.channel.send({ content: `Playlist with title ${createPlaylistData.title} created!` });
     * 
     * @returns {Promise<GuildPlaylist>} Created playlist data
     */
    public create(guildID: string, data: CreatePlaylistData): Promise<GuildPlaylist> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<PlaylistsManager>.create'));
            if(!data) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'data').replace('{data}', '<PlaylistsManager>.create'));

            this.player.database.initGuild(guildID);

            const storage = this.player.database.get();
            const guildPlaylistID = this.player.utils.getUniqueID();
            const guildPlaylists: Array<GuildPlaylist> = storage[guildID]['playlists'];

            const playlistConstructor: GuildPlaylist = {
                id:             guildPlaylistID,
                title:          data.title ? data.title : `Playlist #${guildPlaylistID}`,
                author:         data.author,
                created:        Date.now(),
                updated:        null,
                duration:       await this.player.utils.getTrackDuration(data.track.url),
                lastPlaying:    null,
                tracks:         [data.track]
            }

            guildPlaylists.push(playlistConstructor);

            this.player.database.write(storage);
            this.player.emit(Events.PLAYLIST_CREATED, playlistConstructor);

            return res(playlistConstructor);
        })
    }

    /**
     * Allows you to add new tracks to server playlists
     * 
     * @param {string} guildID Discord Guild ID
     * @param {AddPlaylistData} data Playlist Data
     * 
     * @example
     * const addTrackToPlaylistData = await client.player.playlists.addTrack('GuildID', {
     *      id: 'PlaylistID',
     * 
     *      track: {
     *          title: 'Xtrullor - Samsara',
     *          url: 'https://youtube.com/watch?v=Vt2TeOptLxE'
     *      }
     * })
     * 
     * if(addTrackToPlaylistData?.title) return message.channel.send({ content: `Track Xtrullor - Samsara added to playlist!` });
     * 
     * @returns {Promise<GuildPlaylist | ErrorData>} Changed playlist or object with an error
     */
    public addTrack(guildID: string, data: AddPlaylistData): Promise<GuildPlaylist | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<PlaylistsManager>.addTrack'));
            if(!data) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'data').replace('{data}', '<PlaylistsManager>.addTrack'));

            this.player.database.initGuild(guildID);

            const storage = this.player.database.get();
            const guildPlaylists: Array<GuildPlaylist> = storage[guildID]['playlists'];

            if(guildPlaylists.length >= 1) {
                if(data.id && data.id.length > 0) {
                    const guildPlaylist = guildPlaylists.find(playlist => playlist.id === data.id);

                    if(guildPlaylist) {
                        const playlistTrack = guildPlaylist.tracks.find(track => track.url === data.track.url);

                        if(!playlistTrack) {
                            guildPlaylist.updated = Date.now();
                            guildPlaylist.duration += await this.player.utils.getTrackDuration(data.track.url);
                            guildPlaylist.tracks.push(data.track);

                            this.player.database.write(storage);

                            return res(guildPlaylist);
                        }else return res({ error: { code: 404, message: this.player.errors.playlists.existsTrack.replace('{url}', data.track.url).replace('{id}', data.id) } });
                    }else return res({ error: { code: 404, message: this.player.errors.playlists.notFound.replace('{id}', data.id).replace('{guildID}', guildID) } });
                }else this.create(guildID, { author: this.player.client.user.id, track: data.track });
            }else this.create(guildID, { author: this.player.client.user.id, track: data.track });
        })
    }

    /**
     * Allows you to play a server playlist
     * 
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Guild Playlist ID
     * @param {GuildMember} member Discord Guild Member
     * @param {TextChannel} channel Discord Guild Text Channel
     * 
     * @example
     * client.player.playlists.play('GuildID', 'PlaylistID', message.member, message.channel);
     * 
     * @returns {Promise<GuildPlaylist | ErrorData>} Guild playlist data or object with an error
     */
    public play(guildID: string, playlistID: string, member: GuildMember, channel: TextChannel): Promise<GuildPlaylist | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<PlaylistsManager>.play'));
            if(!playlistID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'playlistID').replace('{data}', '<PlaylistsManager>.play'));
            if(!member) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'member').replace('{data}', '<PlaylistsManager>.play'));
            if(!channel) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'channel').replace('{data}', '<PlaylistsManager>.play'));
            
            const storage = this.player.database.get();

            const guildPlaylists: Array<GuildPlaylist> = storage[guildID]['playlists'];
            if(guildPlaylists.length <= 0) return res({ error: { code: 404, message: this.player.errors.playlists.guildNotFound.replace('{id}', guildID) } });
            
            const guildPlaylist = guildPlaylists.find(playlist => playlist.id === playlistID);
            if(!guildPlaylist) return res({ error: { code: 404, message: this.player.errors.playlists.notFound.replace('{id}', playlistID).replace('{guildID}', guildID) } });

            const playlistTracks = guildPlaylist.tracks;

            for(let i = 0; i < playlistTracks.length; i++) {
                this.player.search(playlistTracks[i].url, member, channel, true);
            }

            guildPlaylist.lastPlaying = Date.now();
            this.player.database.write(storage);

            return res(guildPlaylist);
        })
    }

    /**
     * Allows you to delete tracks by their positions in the playlist
     * 
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Guild Playlist ID
     * @param {number} [index=0] Track index in playlist
     * 
     * @example
     * // Delete first track from playlist
     * const removeTrackFromPlaylistData = await client.player.playlists.removeTrack('GuildID', 'PlaylistID', 0);
     * if(removeTrackFromPlaylistData?.title) return message.channel.send({ content: `Track with index 1 deleted from playlist!` });
     * 
     * @returns {Promise<GuildPlaylist | ErrorData>} Changed playlist or object with an error
     */
    public removeTrack(guildID: string, playlistID: string, index?: number): Promise<GuildPlaylist | ErrorData> {
        return new Promise(async (res, rej) => {
            if(!guildID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'guildID').replace('{data}', '<PlaylistsManager>.removeTrack'));
            if(!playlistID) throw new PlayerError(this.player.errors.default.requireParam.replace('{param}', 'playlistID').replace('{data}', '<PlaylistsManager>.removeTrack'));
            
            const i = index || 0;
            const storage = this.player.database.get();

            const guildPlaylists: Array<GuildPlaylist> = storage[guildID]['playlists'];
            if(guildPlaylists.length <= 0) return res({ error: { code: 404, message: this.player.errors.playlists.guildNotFound.replace('{id}', guildID) } });
            
            const guildPlaylist = guildPlaylists.find(playlist => playlist.id === playlistID);
            if(!guildPlaylist) return res({ error: { code: 404, message: this.player.errors.playlists.notFound.replace('{id}', playlistID).replace('{guildID}', guildID) } });

            const playlistTracks = guildPlaylist.tracks;
            if(!playlistTracks[i]) return res({ error: { code: 404, message: this.player.errors.playlists.trackNotFound.replace('{index}', index.toString()).replace('{id}', playlistID) } });

            guildPlaylist.updated = Date.now();
            guildPlaylist.duration = guildPlaylist.duration - await this.player.utils.getTrackDuration(playlistTracks[i]?.url);
            playlistTracks.splice(i, 1);

            this.player.database.write(storage);

            return res(guildPlaylist);
        })
    }

    /**
     * Allows you to delete server playlists by ID
     * 
     * @param {string} guildID Discord Guild ID
     * @param {string} playlistID Guild Playlist ID
     * 
     * @fires Player#deletedPlaylist
     * 
     * @example
     * const deletedPlaylisData = await client.player.playlists.delete('GuildID', 'PlaylistID');
     * if(deletedPlaylisData?.title) return message.channel.send({ content: `Playlist with title ${deletedPlaylisData.title} deleted!` });
     * 
     * @returns {Promise<GuildPlaylist | ErrorData>} Deleted playlist or object with an error
     */
    public delete(guildID: string, playlistID: string): Promise<GuildPlaylist | ErrorData> {
        return new Promise(async (res, rej) => {
            const storage = this.player.database.get();

            const guildPlaylists: Array<GuildPlaylist> = storage[guildID]['playlists'];
            if(guildPlaylists.length <= 0) return res({ error: { code: 404, message: this.player.errors.playlists.guildNotFound.replace('{id}', guildID) } });
            
            const guildPlaylist = guildPlaylists.find(playlist => playlist.id === playlistID);
            if(!guildPlaylist) return res({ error: { code: 404, message: this.player.errors.playlists.notFound.replace('{id}', playlistID).replace('{guildID}', guildID) } });

            guildPlaylists.splice(guildPlaylists.indexOf(guildPlaylist), 1);

            this.player.database.write(storage);
            this.player.emit(Events.PLAYLIST_DELETED, guildPlaylist);

            return res(guildPlaylist);
        })
    }
}