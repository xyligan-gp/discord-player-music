/**
 * Lyrics received from a lyrics provider
 *
 * @typedef {object} LyricsResult
 *
 * @prop {string} text Lyrics
 * @prop {string} [title] Song title
 * @prop {string} [artist] Song artist
 * @prop {string} source Name of the provider that found the lyrics
 */
export interface LyricsResult {
    text: string;
    title?: string;
    artist?: string;
    source: string;
}

/**
 * Interface that every lyrics source must implement.
 * A provider can be passed to the `lyrics` player option.
 *
 * @typedef {object} LyricsProvider
 *
 * @prop {string} name Unique provider name
 * @prop {function(string): Promise<LyricsResult | null>} search Searches lyrics by a query like `Artist - Title`. It resolves to `null` when nothing was found and rejects when the service can not be reached.
 */
export interface LyricsProvider {
    readonly name: string;

    search(query: string): Promise<LyricsResult | null>;
}
