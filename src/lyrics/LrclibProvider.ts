import { LyricsProvider, LyricsResult } from './LyricsProvider';

/**
 * Response item of the LRCLIB search
 *
 * @private
 */
interface LrclibItem {
    trackName?: string;
    artistName?: string;
    instrumental?: boolean;
    plainLyrics?: string | null;
}

/**
 * Options of the LRCLIB provider
 *
 * @typedef {object} LrclibProviderOptions
 *
 * @prop {string} [baseURL='https://lrclib.net'] LRCLIB server (you can use your own instance)
 * @prop {string} [userAgent] User agent for requests (LRCLIB asks clients to introduce themselves)
 * @prop {number} [timeout=10000] Request timeout in milliseconds
 */
export interface LrclibProviderOptions {
    baseURL?: string;
    userAgent?: string;
    timeout?: number;
}

/**
 * Default lyrics source. Uses the free LRCLIB service (https://lrclib.net), no API key is needed.
 *
 * @class
 * @classdesc Lyrics provider (LRCLIB)
 * @implements {LyricsProvider}
 *
 * @example
 * const player = new Player(client, { lyrics: new LrclibProvider({ timeout: 5000 }) });
 */
export class LrclibProvider implements LyricsProvider {
    /**
     * Provider name
     *
     * @type {string}
     */
    public readonly name: string = 'lrclib';

    private options: Required<LrclibProviderOptions>;

    /**
     * @constructor
     *
     * @param {LrclibProviderOptions} [options] Provider options
     */
    constructor(options: LrclibProviderOptions = {}) {
        this.options = {
            baseURL: (options.baseURL ?? 'https://lrclib.net').replace(/\/+$/, ''),
            userAgent: options.userAgent ?? 'discord-player-music (https://dpm.js.org)',
            timeout: options.timeout ?? 10_000
        }
    }

    /**
     * Searches lyrics by a query
     *
     * @param {string} query Query like `Artist - Title`
     *
     * @throws {Error} If the service can not be reached or answers with an error
     *
     * @returns {Promise<LyricsResult | null>} Lyrics or `null` if nothing was found
     */
    public async search(query: string): Promise<LyricsResult | null> {
        const response = await fetch(`${this.options.baseURL}/api/search?q=${encodeURIComponent(query)}`, {
            headers: { 'user-agent': this.options.userAgent },
            signal: AbortSignal.timeout(this.options.timeout)
        })

        if(!response.ok) throw new Error(`LRCLIB responded with status ${response.status}`);

        const items = (await response.json()) as Array<LrclibItem>;
        const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

        // The result whose artist and title contain most of the words of the query wins
        let best: { item: LrclibItem, score: number } | null = null;

        for(const item of items) {
            if(item.instrumental || !item.plainLyrics?.trim()) continue;

            const name = `${item.artistName ?? ''} ${item.trackName ?? ''}`.toLowerCase();
            const score = words.filter(word => name.includes(word)).length;

            if(!best || score > best.score) best = { item, score };
        }

        if(!best) return null;

        return { text: (best.item.plainLyrics as string).trim(), title: best.item.trackName, artist: best.item.artistName, source: this.name };
    }
}
