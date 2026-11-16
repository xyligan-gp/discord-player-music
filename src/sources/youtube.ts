// Helpers for YouTube links shared by the YouTube providers

const HOSTS = /^(?:www\.|m\.|music\.)?youtube\.com$/;

/**
 * Extracts the ID of a YouTube playlist from a link (`/playlist?list=ID` or a video link with `list=ID`).
 * Automatic mixes (`RD...`), the liked videos list and the watch later list are not playlists that can be loaded, so they are ignored.
 *
 * @param {string} input Link
 *
 * @returns {string | null} Playlist ID or `null` if the link is not a playlist link
 * @private
 */
export function parsePlaylistID(input: string): string | null {
    try {
        const url = new URL(input);
        if(!HOSTS.test(url.hostname)) return null;

        const id = url.searchParams.get('list');

        return id && /^[\w-]{10,}$/.test(id) && !/^(?:RD|LL|WL)/.test(id) ? id : null;
    }catch{
        return null;
    }
}
