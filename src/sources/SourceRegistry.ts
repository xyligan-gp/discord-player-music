import { Readable } from 'node:stream';

import { SourcePlaylist, SourceProvider, SourceStreamOptions, SourceTrack } from './SourceProvider';

/**
 * Callback that is called when a provider fails and the registry moves on to the next one
 *
 * @callback ProviderFailedCallback
 *
 * @param {SourceProvider} provider Provider that failed
 * @param {string} method Failed method (`search`, `resolve` or `stream`)
 * @param {Error} error Error thrown by the provider
 */
export type ProviderFailedCallback = (provider: SourceProvider, method: 'search' | 'resolve' | 'stream' | 'resolvePlaylist', error: Error) => void;

/**
 * Options of the source registry
 *
 * @typedef {object} SourceRegistryOptions
 *
 * @prop {number} [failureThreshold=1] After this many failures in a row (for any tracks) a provider is moved to the end of the list of providers for the given operation
 * @prop {number} [cooldown=600000] For how long (in milliseconds) such a provider stays at the end before it is tried first again
 */
export interface SourceRegistryOptions {
    failureThreshold?: number;
    cooldown?: number;
}

/**
 * Class that stores track sources by priority and falls back to the next one when a source fails.
 * When a provider fails, the next tracks (of any videos) go to the next provider first for a while, so the working provider is not delayed by the failing one.
 *
 * @class
 * @classdesc Source Registry Class
 *
 * @example
 * const registry = new SourceRegistry([new YoutubeiProvider(), new YtDlpProvider()]);
 * const tracks = await registry.search('Imagine Dragons - Thunder', 5);
 */
export class SourceRegistry {
    private providers: Array<SourceProvider>;
    private health: Map<string, { failures: number, until: number }> = new Map();
    private options: Required<SourceRegistryOptions>;

    /**
     * Called every time a provider fails and the registry tries the next one
     *
     * @type {ProviderFailedCallback | null}
     */
    public onProviderFailed: ProviderFailedCallback | null = null;

    /**
     * @constructor
     *
     * @param {Array<SourceProvider>} [providers=[]] Providers in order of priority
     * @param {SourceRegistryOptions} [options] Options
     */
    constructor(providers: Array<SourceProvider> = [], options: SourceRegistryOptions = {}) {
        this.providers = [...providers];
        this.options = { failureThreshold: options.failureThreshold ?? 1, cooldown: options.cooldown ?? 600_000 };

        for(const provider of this.providers) this.attach(provider);
    }

    /**
     * Gives the provider access to the other providers of the registry (the optional `attach` method of the provider)
     *
     * @param {SourceProvider} provider Provider
     * @private
     */
    private attach(provider: SourceProvider): void {
        provider.attach?.(() => this.providers.filter(item => item !== provider));
    }

    /**
     * Registered providers in order of priority
     *
     * @type {Array<SourceProvider>}
     *
     * @returns {Array<SourceProvider>} Copy of the provider list
     */
    public get list(): Array<SourceProvider> {
        return [...this.providers];
    }

    /**
     * Adds a provider
     *
     * @param {SourceProvider} provider Provider to add
     * @param {number} [index] Position in the priority list (the end by default)
     *
     * @throws {Error} If a provider with the same name is already registered
     *
     * @returns {SourceRegistry} The registry
     */
    public register(provider: SourceProvider, index?: number): this {
        if(this.providers.some(item => item.name === provider.name)) throw new Error(`Source provider '${provider.name}' is already registered`);

        if(index === undefined) this.providers.push(provider);
        else this.providers.splice(index, 0, provider);

        this.attach(provider);

        return this;
    }

    /**
     * Removes a provider
     *
     * @param {string} name Provider name
     *
     * @returns {boolean} `true` if the provider was removed
     */
    public unregister(name: string): boolean {
        const index = this.providers.findIndex(provider => provider.name === name);
        if(index < 0) return false;

        this.providers.splice(index, 1);

        return true;
    }

    /**
     * Runs an action on providers one by one until one succeeds
     *
     * @param {Array<SourceProvider>} providers Providers to try
     * @param {string} method Method name (used for events and errors)
     * @param {function(SourceProvider): Promise<T>} action Action to run
     *
     * @throws {Error} If every provider fails or there are no suitable providers
     *
     * @returns {Promise<T>} Result of the first successful provider
     * @private
     */
    private async attempt<T>(providers: Array<SourceProvider>, method: 'search' | 'resolve' | 'stream' | 'resolvePlaylist', action: (provider: SourceProvider) => Promise<T>): Promise<T> {
        if(!providers.length) throw new Error(`No source provider can handle '${method}'`);

        const failures: Array<string> = [];
        const now = Date.now();
        const isPenalized = (provider: SourceProvider) => (this.health.get(`${provider.name}:${method}`)?.until ?? 0) > now;

        // Providers that keep failing go last (the order of the others is kept)
        const ordered = [...providers.filter(provider => !isPenalized(provider)), ...providers.filter(isPenalized)];

        for(const provider of ordered) {
            const key = `${provider.name}:${method}`;

            try {
                const result = await action(provider);

                this.health.delete(key);

                return result;
            }catch(error) {
                const err = error instanceof Error ? error : new Error(String(error));
                const state = this.health.get(key) ?? { failures: 0, until: 0 };

                state.failures++;
                if(state.failures >= this.options.failureThreshold) state.until = Date.now() + this.options.cooldown;

                this.health.set(key, state);

                failures.push(`${provider.name}: ${err.message}`);
                this.onProviderFailed?.(provider, method, err);
            }
        }

        throw new Error(`All source providers failed to ${method} (${failures.join('; ')})`);
    }

    /**
     * Providers that can handle the URL, in order of priority
     *
     * @param {string} url Track URL
     *
     * @returns {Array<SourceProvider>} Suitable providers
     * @private
     */
    private forURL(url: string): Array<SourceProvider> {
        return this.providers.filter(provider => provider.canHandle(url));
    }

    /**
     * Searches tracks by text query
     *
     * @param {string} query Search query
     * @param {number} [limit=10] Maximum number of results
     *
     * @throws {Error} If every provider fails
     *
     * @returns {Promise<Array<SourceTrack>>} Found tracks (empty if nothing was found)
     */
    public search(query: string, limit: number = 10): Promise<Array<SourceTrack>> {
        return this.attempt(this.providers, 'search', provider => provider.search(query, limit));
    }

    /**
     * Gets track information by URL
     *
     * @param {string} url Track URL
     *
     * @throws {Error} If no provider handles the URL or every provider fails
     *
     * @returns {Promise<SourceTrack>} Track information
     */
    public resolve(url: string): Promise<SourceTrack> {
        return this.attempt(this.forURL(url), 'resolve', provider => provider.resolve(url));
    }

    /**
     * Checks whether the URL is a playlist link that one of the providers can load
     *
     * @param {string} url Link
     *
     * @returns {boolean} `true` if the link is a playlist link
     */
    public isPlaylist(url: string): boolean {
        return this.providers.some(provider => provider.isPlaylist?.(url));
    }

    /**
     * Gets the tracks of a playlist by URL
     *
     * @param {string} url Playlist URL
     * @param {number} [limit=100] Maximum number of tracks
     *
     * @throws {Error} If no provider handles the URL or every provider fails
     *
     * @returns {Promise<SourcePlaylist>} Playlist
     */
    public resolvePlaylist(url: string, limit: number = 100): Promise<SourcePlaylist> {
        return this.attempt(this.providers.filter(provider => provider.resolvePlaylist && provider.isPlaylist?.(url)), 'resolvePlaylist', provider => (provider.resolvePlaylist as NonNullable<SourceProvider['resolvePlaylist']>)(url, limit));
    }

    /**
     * Creates an Ogg Opus stream for a track
     *
     * @param {string} url Track URL
     * @param {SourceStreamOptions} [options] Seek and filter options
     *
     * @throws {Error} If no provider handles the URL or every provider fails
     *
     * @returns {Promise<Readable>} Ogg Opus stream
     */
    public stream(url: string, options?: SourceStreamOptions): Promise<Readable> {
        return this.open(url, options).then(opened => opened.stream);
    }

    /**
     * Creates an Ogg Opus stream for a track and tells which provider gave it
     *
     * @param {string} url Track URL
     * @param {SourceStreamOptions} [options] Seek and filter options
     *
     * @throws {Error} If no provider handles the URL or every provider fails
     *
     * @returns {Promise<{ stream: Readable, provider: SourceProvider }>} The stream and the provider that gave it
     */
    public open(url: string, options?: SourceStreamOptions): Promise<{ stream: Readable, provider: SourceProvider }> {
        return this.attempt(this.forURL(url), 'stream', async provider => ({ stream: await provider.stream(url, options), provider }));
    }
}
