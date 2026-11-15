import { Readable } from 'node:stream';
import { Innertube, Log, UniversalCache } from 'youtubei.js';

import { SourcePlaylist, SourceProvider, SourceRelatedOptions, SourceStreamOptions, SourceTrack } from './SourceProvider';
import { parsePlaylistID } from './youtube';
import { readYouTubeCookies } from './cookies';
import { createOpusStream } from './AudioPipeline';

// User agent of the iOS client (the audio URLs of this client are bound to it)
const IOS_USER_AGENT = 'com.google.ios.youtube/20.11.6 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)';

/**
 * Options of the youtubei provider
 *
 * @typedef {object} YoutubeiProviderOptions
 *
 * @prop {boolean} [warnings=false] Show the parser warnings of `youtubei.js` in the console. YouTube changes its pages often and the library reports what it does not know yet (a page of a video has many such reports), they are not errors. `false` shows only the errors of the library (the log level of `youtubei.js` is global).
 * @prop {string} [cookies] Path of a cookies file (Netscape format) with the cookies of a signed-in YouTube account. With it the provider can read information about age-restricted videos and load private playlists (the audio of such videos is played by the next provider, yt-dlp). The same file can be used by `YtDlpProvider`, see the FAQ about the cookies.
 */
export interface YoutubeiProviderOptions {
    warnings?: boolean;
    cookies?: string;
}

/**
 * YouTube source based on `youtubei.js` (InnerTube). Default provider of the module.
 *
 * @class
 * @classdesc YouTube provider (youtubei.js)
 * @implements {SourceProvider}
 *
 * @example
 * const player = new Player(client, { sources: [new YoutubeiProvider({ cookies: './cookies.txt' }), new YtDlpProvider({ cookies: './cookies.txt' })] });
 */
export class YoutubeiProvider implements SourceProvider {
    /**
     * Provider name
     *
     * @type {string}
     */
    public readonly name: string = 'youtubei';

    private innertube: Promise<Innertube> | null = null;
    private signedIn: Promise<Innertube> | null = null;
    private options: YoutubeiProviderOptions;

    /**
     * @constructor
     *
     * @param {YoutubeiProviderOptions} [options] Provider options
     */
    constructor(options: YoutubeiProviderOptions = {}) {
        this.options = options;

        if(!options.warnings) Log.setLevel(Log.Level.ERROR);
    }

    /**
     * Returns a shared InnerTube client
     *
     * @returns {Promise<Innertube>} InnerTube client
     * @private
     */
    private client(): Promise<Innertube> {
        // The audio is received with the iOS client, which does not accept cookies (YouTube answers with the status 400), so this session never has them
        if(!this.innertube) {
            this.innertube = Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true }).catch(error => {
                this.innertube = null;

                throw error;
            })
        }

        return this.innertube;
    }

    /**
     * Returns a signed-in session (made with the cookies), or `null` when there are no cookies.
     * It is used for what a signed-in session can do: information about age-restricted videos and private playlists.
     *
     * @returns {Promise<Innertube | null>} Signed-in InnerTube client
     * @private
     */
    private async signedClient(): Promise<Innertube | null> {
        if(!this.options.cookies) return null;

        if(!this.signedIn) {
            this.signedIn = (async () => Innertube.create({ cache: new UniversalCache(false), retrieve_player: false, generate_session_locally: false, cookie: await readYouTubeCookies(this.options.cookies as string) }))().catch(error => {
                this.signedIn = null;

                throw error;
            })
        }

        return this.signedIn;
    }

    /**
     * Extracts a video ID from a YouTube URL
     *
     * @param {string} input Video URL
     *
     * @returns {string | null} Video ID or `null`
     * @private
     */
    private parseID(input: string): string | null {
        try {
            const url = new URL(input);

            if(url.hostname === 'youtu.be') return url.pathname.slice(1, 12) || null;
            if(url.hostname.endsWith('youtube.com')) return url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] || null;
        }catch{ }

        return null;
    }

    /**
     * Creates the InnerTube session ahead of time, so the first search does not wait for it. The player calls it when it is created.
     *
     * @throws {Error} If YouTube can not be reached
     *
     * @returns {Promise<void>} Resolves when the session is ready
     */
    public async prepare(): Promise<void> {
        await this.client();
        await this.signedClient();
    }

    /**
     * Checks that the URL is a YouTube video URL
     *
     * @param {string} url Track URL
     *
     * @returns {boolean} `true` if the URL can be handled
     */
    public canHandle(url: string): boolean {
        return this.parseID(url) !== null;
    }

    /**
     * Checks that the URL is a link to a YouTube playlist
     *
     * @param {string} url Link
     *
     * @returns {boolean} `true` if the link is a playlist link (automatic mixes and private lists are not supported)
     */
    public isPlaylist(url: string): boolean {
        return parsePlaylistID(url) !== null;
    }

    /**
     * Gets the tracks of a YouTube playlist
     *
     * @param {string} url Playlist link
     * @param {number} limit Maximum number of tracks
     *
     * @throws {Error} If the link is not a playlist link, the playlist is not available or it has no playable videos
     *
     * @returns {Promise<SourcePlaylist>} Playlist
     */
    public async resolvePlaylist(url: string, limit: number): Promise<SourcePlaylist> {
        const id = parsePlaylistID(url);
        if(!id) throw new Error(`Not a YouTube playlist URL: ${url}`);

        // A signed-in session can also load private playlists of the account
        const client = (await this.signedClient()) ?? await this.client();
        let page = await client.getPlaylist(id);

        const title = page.info.title ?? '';
        const tracks: Array<SourceTrack> = [];

        for(;;) {
            for(const item of page.items) {
                const track = this.toPlaylistTrack(item as unknown as Record<string, any>);

                if(track && tracks.length < limit) tracks.push(track);
            }

            if(tracks.length >= limit || !page.has_continuation) break;

            page = await page.getContinuation();
        }

        if(!tracks.length) throw new Error(`The playlist has no playable videos: ${id}`);

        return { id, title, url: `https://www.youtube.com/playlist?list=${id}`, tracks, source: this.name };
    }

    /**
     * Converts an item of a playlist (YouTube returns either `PlaylistVideo` or the newer `LockupView`) to a track
     *
     * @param {object} item Playlist item
     *
     * @returns {SourceTrack | null} Track or `null` if the item is not a playable video
     * @private
     */
    private toPlaylistTrack(item: Record<string, any>): SourceTrack | null {
        const id: string | undefined = item.content_type === 'VIDEO' || item.type === 'PlaylistVideo' || item.type === 'CompactVideo' || item.type === 'Video' ? (item.content_id ?? item.id) : undefined;
        if(!id || item.is_playable === false) return null;

        // PlaylistVideo has the duration in seconds, LockupView has it as a text badge like `1:02:03`
        let seconds: number = item.duration?.seconds ?? 0;

        if(!seconds) {
            const badge = item.content_image?.overlays?.flatMap((overlay: Record<string, any>) => overlay.badges ?? []).find((entry: Record<string, any>) => /^\d+(?::\d+)+$/.test(entry.text ?? ''))?.text;

            if(badge) seconds = (badge as string).split(':').reduce((total, part) => total * 60 + Number(part), 0);
        }

        const author = item.author?.name ?? item.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text ?? '';

        return {
            id,
            title: item.title?.text ?? item.metadata?.title?.text ?? '',
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail: item.thumbnails?.[0]?.url ?? item.content_image?.image?.[0]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            seconds,

            author: {
                name: author,
                url: item.author?.url ?? ''
            },

            source: this.name
        }
    }

    /**
     * Finds videos related to a video: the "up next" feed of the watch page (`getInfo` of the WEB client; the IOS client that gives the audio has no such
     * feed, and its basic information does not include it). Live streams and the excluded videos are skipped.
     *
     * @param {SourceTrack} track Track to find the related videos for (its URL is used)
     * @param {SourceRelatedOptions} options How many videos are wanted and which URLs must not be returned
     *
     * @throws {Error} If the URL is not a YouTube video link, YouTube fails or the feed has no videos
     *
     * @returns {Promise<Array<SourceTrack>>} Related videos
     */
    public async related(track: SourceTrack, options: SourceRelatedOptions): Promise<Array<SourceTrack>> {
        const id = this.parseID(track.url);
        if(!id) throw new Error(`Not a YouTube video URL: ${track.url}`);

        const client = await this.client();
        const info = await client.getInfo(id);
        const feed = (info as unknown as { watch_next_feed?: Array<Record<string, any>> }).watch_next_feed ?? [];
        const exclude = new Set(options.exclude ?? []);
        const tracks: Array<SourceTrack> = [];

        for(const item of feed) {
            const found = this.toPlaylistTrack(item);

            if(!found || found.id === id || found.seconds <= 0 || exclude.has(found.url)) continue;

            tracks.push(found);

            if(tracks.length >= options.limit) break;
        }

        if(!tracks.length) throw new Error(`YouTube gave no related videos for ${id}`);

        return tracks;
    }

    /**
     * Searches videos on YouTube
     *
     * @param {string} query Search query
     * @param {number} limit Maximum number of results
     *
     * @throws {Error} If YouTube can not be reached
     *
     * @returns {Promise<Array<SourceTrack>>} Found tracks
     */
    public async search(query: string, limit: number): Promise<Array<SourceTrack>> {
        const client = await this.client();
        const results = await client.search(query, { type: 'video' });
        const tracks: Array<SourceTrack> = [];

        for(const item of results.results ?? []) {
            const video = item as any;
            if(video.type !== 'Video' || !video.id) continue;

            tracks.push({
                id: video.id,
                title: video.title?.text ?? '',
                url: `https://www.youtube.com/watch?v=${video.id}`,
                thumbnail: video.thumbnails?.[0]?.url ?? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
                seconds: video.duration?.seconds ?? 0,

                author: {
                    name: video.author?.name ?? '',
                    url: video.author?.url ?? ''
                },

                source: this.name
            })

            if(tracks.length >= limit) break;
        }

        return tracks;
    }

    /**
     * Gets information about a video
     *
     * @param {string} url Video URL
     *
     * @throws {Error} If the URL is not a YouTube URL or the video is not playable
     *
     * @returns {Promise<SourceTrack>} Track information
     */
    public async resolve(url: string): Promise<SourceTrack> {
        const id = this.parseID(url);
        if(!id) throw new Error(`Not a YouTube video URL: ${url}`);

        const client = await this.client();
        let info = await client.getBasicInfo(id, { client: 'IOS' });

        // An age-restricted video: its information is available to a signed-in session (the audio is not, the next provider plays it)
        if(info.playability_status?.status === 'LOGIN_REQUIRED') {
            const signedIn = await this.signedClient();

            if(signedIn) info = await signedIn.getBasicInfo(id, { client: 'WEB' });
        }

        if(info.playability_status?.status !== 'OK') throw new Error(`Video is not playable (${info.playability_status?.status}): ${id}`);

        const details = info.basic_info;

        return {
            id,
            title: details.title ?? '',
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail: details.thumbnail?.[0]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            seconds: details.duration ?? 0,

            author: {
                name: details.author ?? '',
                url: details.channel?.url ?? (details.channel_id ? `https://www.youtube.com/channel/${details.channel_id}` : '')
            },

            source: this.name
        }
    }

    /**
     * Downloads audio in 1 MiB ranged chunks (the iOS client rejects bigger ranges with 403, and some videos are rejected by the built-in downloader of youtubei.js)
     *
     * @param {string} url Direct audio URL
     * @param {number} length Audio size in bytes
     *
     * @returns {AsyncGenerator<Buffer>} Audio chunks
     * @private
     */
    private async *download(url: string, length: number): AsyncGenerator<Buffer> {
        const chunkSize = 1024 * 1024;

        for(let start = 0; start < length; start += chunkSize) {
            const end = Math.min(start + chunkSize, length) - 1;
            const response = await fetch(url, { headers: { range: `bytes=${start}-${end}`, 'user-agent': IOS_USER_AGENT } });

            if(!response.ok) throw new Error(`YouTube responded with status ${response.status} for bytes ${start}-${end}`);

            yield Buffer.from(await response.arrayBuffer());
        }
    }

    /**
     * Creates an Ogg Opus stream for a video
     *
     * @param {string} url Video URL
     * @param {SourceStreamOptions} [options] Seek and filter options
     *
     * @throws {Error} If the audio can not be received in full (this is checked before the stream is returned, so the registry can use the next provider)
     *
     * @returns {Promise<Readable>} Ogg Opus stream
     */
    public async stream(url: string, options: SourceStreamOptions = {}): Promise<Readable> {
        const id = this.parseID(url);
        if(!id) throw new Error(`Not a YouTube video URL: ${url}`);

        const client = await this.client();
        const info = await client.getBasicInfo(id, { client: 'IOS' });

        // Age-restricted videos (and others that need a login) have no audio for this client: the next provider plays them
        if(info.playability_status?.status !== 'OK') throw new Error(`Video is not playable (${info.playability_status?.status}), the audio needs a signed-in client: ${id}`);

        const format = info.chooseFormat({ type: 'audio', quality: 'best' });

        const directURL = format.url ?? await format.decipher(client.session.player);
        if(!directURL) throw new Error(`No audio URL for video: ${id}`);

        const length = Number(format.content_length) || 0;
        if(!length) throw new Error(`Unknown audio size for video: ${id}`);

        // Some videos (YouTube requires a PO token for them) are only readable up to the first MiB.
        // Check the end of the audio now, so the registry can use the next provider instead of failing in the middle of the track.
        const probe = await fetch(directURL, { headers: { range: `bytes=${Math.max(length - 1024, 0)}-${length - 1}`, 'user-agent': IOS_USER_AGENT } });
        await probe.arrayBuffer();

        if(!probe.ok) throw new Error(`YouTube does not allow to download the whole audio of video ${id} (status ${probe.status}, a PO token may be required)`);

        const chunks = this.download(directURL, length);
        const first = await chunks.next();

        const source = Readable.from((async function* () {
            if(!first.done) yield first.value;

            yield* chunks;
        })(), { objectMode: false });

        return createOpusStream(source, options);
    }
}
