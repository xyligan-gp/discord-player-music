import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';

import { SourcePlaylist, SourceProvider, SourceStreamOptions, SourceTrack } from './SourceProvider';
import { parsePlaylistID } from './youtube';
import { createOpusStream } from './AudioPipeline';
import { ensureBinary, latestVersion, output, updateBinary, YtDlpInstallOptions } from './YtDlpBinary';
import { YtDlpStatusEvent } from '../types/PlayerData';

/**
 * Options of the yt-dlp provider
 *
 * @typedef {object} YtDlpProviderOptions
 *
 * @prop {string} [command] yt-dlp executable (or `python` together with `args: ['-m', 'yt_dlp']`). When it is not set, yt-dlp from PATH is used, and if there is none, the binary is downloaded automatically (see `autoInstall`).
 * @prop {boolean} [autoInstall=true] Download and update yt-dlp automatically when `command` is not set and yt-dlp is not installed
 * @prop {boolean} [lookupPath=true] Look for an installed yt-dlp in PATH first (set `false` to always use the downloaded binary)
 * @prop {YtDlpInstallOptions} [install] Options of the automatic installation (folder, update check, status messages)
 * @prop {string} [cookies] Path of a cookies file (Netscape format) for yt-dlp. YouTube asks servers to sign in sometimes, see the FAQ about the cookies.
 * @prop {Array<string>} [args=[]] Arguments placed before the yt-dlp arguments
 * @prop {Array<string>} [extraArgs=[]] Additional yt-dlp arguments (cookies, proxy, etc.)
 * @prop {object} [env] Environment variables for the process
 */
export interface YtDlpProviderOptions {
    command?: string;
    autoInstall?: boolean;
    lookupPath?: boolean;
    install?: YtDlpInstallOptions;
    cookies?: string;
    args?: Array<string>;
    extraArgs?: Array<string>;
    env?: NodeJS.ProcessEnv;
}

/**
 * Fallback YouTube source that uses an external `yt-dlp` executable.
 * yt-dlp is found in PATH. If it is not installed, the module downloads the official binary from GitHub into `~/.cache/discord-player-music`
 * (the file is checked against the checksums of the release) and checks for a newer version every time the player starts (at most once per hour).
 * Set `autoInstall: false` to disable that.
 *
 * @class
 * @classdesc YouTube provider (yt-dlp)
 * @implements {SourceProvider}
 *
 * @example
 * // yt-dlp is found or downloaded automatically
 * const provider = new YtDlpProvider({ extraArgs: ['--cookies', 'cookies.txt'] });
 *
 * // Your own yt-dlp
 * const custom = new YtDlpProvider({ command: '/usr/local/bin/yt-dlp' });
 */
export class YtDlpProvider implements SourceProvider {
    /**
     * Provider name
     *
     * @type {string}
     */
    public readonly name: string = 'yt-dlp';

    private options: YtDlpProviderOptions & Required<Pick<YtDlpProviderOptions, 'autoInstall' | 'lookupPath' | 'args' | 'extraArgs' | 'env'>>;
    private resolved: Promise<{ command: string, args: Array<string> }> | null = null;

    /**
     * Called at every step of finding, checking, downloading and updating yt-dlp. The player sets it and emits the `ytdlpStatus` event.
     *
     * @type {function(YtDlpStatusEvent): void}
     */
    public onStatus?: (event: YtDlpStatusEvent) => void;

    /**
     * @constructor
     *
     * @param {YtDlpProviderOptions} [options] Provider options
     */
    constructor(options: YtDlpProviderOptions = {}) {
        this.options = {
            command: options.command,
            autoInstall: options.autoInstall ?? true,
            lookupPath: options.lookupPath ?? true,
            install: options.install,
            args: options.args ?? [],
            extraArgs: [...(options.cookies ? ['--cookies', options.cookies] : []), ...(options.extraArgs ?? [])],
            env: options.env ?? process.env
        }
    }

    /**
     * Finds the yt-dlp executable: the `command` option, yt-dlp from PATH, or the automatically downloaded binary.
     * The result is cached.
     *
     * @throws {Error} If yt-dlp is not installed and can not be downloaded
     *
     * @returns {Promise<{ command: string, args: Array<string> }>} Command and its leading arguments
     * @private
     */
    private executable(): Promise<{ command: string, args: Array<string> }> {
        if(!this.resolved) {
            this.resolved = (async () => {
                if(this.options.command) {
                    const version = (await output(this.options.command, [...this.options.args, '--version'], 10_000))?.trim();

                    this.status({ stage: 'found', origin: 'command', path: this.options.command, version, message: `Using yt-dlp ${version ?? '(unknown version)'} from the command option: ${this.options.command}` });
                    this.status({ stage: 'skipped', origin: 'command', reason: 'custom-command', message: 'The update check is skipped, the module does not update a yt-dlp that is given with the command option' });

                    return { command: this.options.command, args: this.options.args };
                }

                const installed = this.options.lookupPath ? (await output('yt-dlp', ['--version'], 10_000))?.trim() : undefined;

                if(installed) {
                    this.status({ stage: 'found', origin: 'path', path: 'yt-dlp', version: installed, message: `Using yt-dlp ${installed} from PATH` });

                    // A yt-dlp that you installed is never changed by the module, but it tells you when it is old
                    void this.checkInstalledVersion(installed);

                    return { command: 'yt-dlp', args: this.options.args };
                }

                if(!this.options.autoInstall) throw new Error('yt-dlp is not installed. Install it, set the `command` option or enable `autoInstall`.');

                const install = { ...this.options.install, onStatus: (event: YtDlpStatusEvent) => this.status(event) };
                const binary = await ensureBinary(install);
                const version = (await output(binary, ['--version'], 10_000))?.trim();

                this.status({ stage: 'found', origin: 'managed', path: binary, version, message: `Using yt-dlp ${version ?? '(unknown version)'} downloaded by the module: ${binary}` });

                // A newer version of the downloaded binary is installed when the player starts (see `prepare`)
                await updateBinary(binary, install);

                // The downloaded yt-dlp solves YouTube challenges with the Node.js that runs the bot
                return { command: binary, args: ['--js-runtimes', `node:${process.execPath}`, ...this.options.args] };
            })().catch(error => {
                // A failure is not cached: the next call tries again
                this.resolved = null;

                throw error;
            })
        }

        return this.resolved;
    }

    /**
     * Reports a step to the `onStatus` callbacks
     *
     * @param {YtDlpStatusEvent} event Event
     * @private
     */
    private status(event: YtDlpStatusEvent): void {
        this.options.install?.onStatus?.(event);
        this.onStatus?.(event);
    }

    /**
     * Compares the version of the yt-dlp from PATH with the latest release and reports it when it is old. Errors are ignored.
     *
     * @param {string} installed Version of the installed yt-dlp
     * @private
     */
    private async checkInstalledVersion(installed: string): Promise<void> {
        const base = { origin: 'path' as const, path: 'yt-dlp', version: installed };

        if(this.options.install?.update === false) return this.status({ ...base, stage: 'skipped', reason: 'update-disabled', message: 'The version check is turned off (install.update is false)' });

        this.status({ ...base, stage: 'checking', message: `Checking whether yt-dlp ${installed} from PATH is the latest version` });

        try {
            const latest = await latestVersion(this.options.install);

            if(latest === installed) return this.status({ ...base, stage: 'up-to-date', latest, message: `yt-dlp ${installed} is up to date` });

            this.status({ ...base, stage: 'update-available', latest, message: `yt-dlp ${installed} from PATH is not the latest version, ${latest} is available. The module does not change it: update it the way you installed it (for example yt-dlp -U, or winget upgrade yt-dlp.yt-dlp)` });
        }catch(error) {
            this.status({ ...base, stage: 'skipped', reason: 'offline', message: `The version check was skipped, GitHub can not be reached: ${(error as Error).message}` });
        }
    }

    /**
     * Finds, downloads or updates yt-dlp ahead of time. The player calls it when it is created, so the first track does not wait for the download.
     * The update check (when yt-dlp is managed by the module) compares the installed version with the latest release and downloads the new one.
     *
     * @throws {Error} If yt-dlp is not installed and can not be downloaded
     *
     * @returns {Promise<void>} Resolves when yt-dlp is ready to use
     */
    public async prepare(): Promise<void> {
        await this.executable();
    }

    /**
     * Checks that the URL is a YouTube URL
     *
     * @param {string} url Track URL
     *
     * @returns {boolean} `true` if the URL can be handled
     */
    public canHandle(url: string): boolean {
        return /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//.test(url);
    }

    /**
     * Runs yt-dlp and returns its standard output
     *
     * @param {Array<string>} args yt-dlp arguments
     *
     * @throws {Error} If yt-dlp can not be started or exits with an error
     *
     * @returns {Promise<string>} Standard output
     * @private
     */
    private async run(args: Array<string>): Promise<string> {
        const executable = await this.executable();

        return new Promise((resolve, reject) => {
            const child = spawn(executable.command, [...executable.args, ...args, ...this.options.extraArgs], { env: this.options.env, stdio: ['ignore', 'pipe', 'pipe'] });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (chunk: Buffer) => stdout += chunk);
            child.stderr.on('data', (chunk: Buffer) => stderr += chunk);

            child.on('error', reject);
            child.on('close', code => {
                if(code === 0) resolve(stdout);
                else reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim().split('\n').pop()}${/sign in|not a bot|cookies/i.test(stderr) ? ' (YouTube asks to sign in or to confirm that you are not a bot: pass the cookies of an account with the `cookies` option, see the FAQ)' : ''}`));
            })
        })
    }

    /**
     * Converts yt-dlp JSON into a track
     *
     * @param {any} data yt-dlp JSON
     *
     * @returns {SourceTrack} Track
     * @private
     */
    private toTrack(data: any): SourceTrack {
        const id: string = data.id;

        return {
            id,
            title: data.title ?? '',
            url: `https://www.youtube.com/watch?v=${id}`,
            thumbnail: data.thumbnail ?? data.thumbnails?.[data.thumbnails.length - 1]?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            seconds: data.duration ?? 0,

            author: {
                name: data.channel ?? data.uploader ?? '',
                url: data.channel_url ?? data.uploader_url ?? ''
            },

            source: this.name
        }
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
     * @throws {Error} If yt-dlp fails or the playlist has no videos
     *
     * @returns {Promise<SourcePlaylist>} Playlist
     */
    public async resolvePlaylist(url: string, limit: number): Promise<SourcePlaylist> {
        const id = parsePlaylistID(url);
        if(!id) throw new Error(`Not a YouTube playlist URL: ${url}`);

        const playlistURL = `https://www.youtube.com/playlist?list=${id}`;
        const output = await this.run([playlistURL, '--dump-json', '--flat-playlist', '--yes-playlist', '--playlist-end', String(limit), '--no-warnings']);

        const entries = output.split('\n').filter(Boolean).map(line => JSON.parse(line));
        const tracks = entries.filter(entry => entry.id && entry.duration !== null && !/^\[(?:Private|Deleted) video\]$/.test(entry.title ?? '')).slice(0, limit).map(entry => this.toTrack(entry));

        if(!tracks.length) throw new Error(`The playlist has no playable videos: ${id}`);

        return { id, title: entries[0]?.playlist_title ?? entries[0]?.playlist ?? '', url: playlistURL, tracks, source: this.name };
    }

    /**
     * Searches videos on YouTube
     *
     * @param {string} query Search query
     * @param {number} limit Maximum number of results
     *
     * @throws {Error} If yt-dlp fails
     *
     * @returns {Promise<Array<SourceTrack>>} Found tracks
     */
    public async search(query: string, limit: number): Promise<Array<SourceTrack>> {
        const output = await this.run([`ytsearch${limit}:${query}`, '--dump-json', '--flat-playlist', '--no-warnings']);

        return output.split('\n').filter(Boolean).map(line => this.toTrack(JSON.parse(line)));
    }

    /**
     * Gets information about a video
     *
     * @param {string} url Video URL
     *
     * @throws {Error} If yt-dlp fails
     *
     * @returns {Promise<SourceTrack>} Track information
     */
    public async resolve(url: string): Promise<SourceTrack> {
        const output = await this.run([url, '--dump-single-json', '--no-playlist', '--no-warnings']);

        return this.toTrack(JSON.parse(output));
    }

    /**
     * Creates an Ogg Opus stream for a video
     *
     * @param {string} url Video URL
     * @param {SourceStreamOptions} [options] Seek and filter options
     *
     * @throws {Error} If yt-dlp can not be started
     *
     * @returns {Promise<Readable>} Ogg Opus stream
     */
    public async stream(url: string, options: SourceStreamOptions = {}): Promise<Readable> {
        const executable = await this.executable();
        const child = spawn(executable.command, [...executable.args, url, '-f', 'bestaudio', '--no-playlist', '-q', '-o', '-', ...this.options.extraArgs], { env: this.options.env, stdio: ['ignore', 'pipe', 'pipe'] });

        await new Promise<void>((resolve, reject) => {
            child.once('spawn', resolve);
            child.once('error', reject);
        })

        // The end of the error output is kept to explain a failure
        let errors = '';

        child.stderr.on('data', (chunk: Buffer) => errors = (errors + chunk).slice(-2000));

        // Wait for the first audio data: when yt-dlp fails (for example YouTube wants to sign in), the error is thrown here,
        // so the next provider can be used, instead of an empty stream that ends the track at once.
        await new Promise<void>((resolve, reject) => {
            const onReadable = () => {
                if(child.stdout.readableLength === 0) return;

                child.stdout.removeListener('readable', onReadable);

                resolve();
            }

            child.stdout.on('readable', onReadable);
            child.once('close', code => {
                child.stdout.removeListener('readable', onReadable);

                if(code === 0 && child.stdout.readableLength > 0) return resolve();

                const message = errors.trim().split('\n').filter(Boolean).pop() ?? `exit code ${code}`;

                reject(new Error(`yt-dlp failed: ${message}${/sign in|not a bot|cookies/i.test(errors) ? ' (YouTube asks to sign in or to confirm that you are not a bot: pass the cookies of an account with the `cookies` option, see the FAQ)' : ''}`));
            })
        })

        child.stdout.once('close', () => child.kill());

        return createOpusStream(child.stdout, options);
    }
}
