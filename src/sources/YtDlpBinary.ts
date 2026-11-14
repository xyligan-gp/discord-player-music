import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chmod, mkdir, rename, stat, utimes, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { YtDlpStatusEvent } from '../types/PlayerData';

/**
 * Options of the yt-dlp binary manager
 *
 * @typedef {object} YtDlpInstallOptions
 *
 * @prop {string} [directory] Folder for the downloaded binary (`~/.cache/discord-player-music` by default)
 * @prop {string} [baseURL] Where the release files are downloaded from (the latest GitHub release of yt-dlp by default)
 * @prop {boolean} [update=true] Check for a newer yt-dlp when the player starts and download it
 * @prop {number} [updateInterval=3600000] Do not check more often than this (in milliseconds), so frequent restarts do not ask GitHub every time. `0` checks on every start.
 * @prop {function(YtDlpStatusEvent): void} [onStatus] Called at every step of finding, checking, downloading and updating yt-dlp (the player turns them into the `ytdlpStatus` event)
 * @prop {string} [latestURL] Address that tells the latest version (the GitHub API of the yt-dlp releases by default)
 * @prop {function} [fetch] `fetch` implementation (for tests)
 * @prop {string} [platform] Platform (for tests)
 * @prop {string} [arch] CPU architecture (for tests)
 */
export interface YtDlpInstallOptions {
    directory?: string;
    baseURL?: string;
    update?: boolean;
    updateInterval?: number;
    onStatus?: (event: YtDlpStatusEvent) => void;
    latestURL?: string;
    fetch?: typeof fetch;
    platform?: string;
    arch?: string;
}

// Default release location: the files of the latest yt-dlp release
const DEFAULT_BASE_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
const DEFAULT_LATEST_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';

/**
 * Returns the name of the yt-dlp release file for the platform
 *
 * @param {string} platform Node.js platform (`process.platform`)
 * @param {string} arch CPU architecture (`process.arch`)
 *
 * @returns {string} Release file name
 * @private
 */
export function assetName(platform: string, arch: string): string {
    if(platform === 'win32') return arch === 'arm64' ? 'yt-dlp_arm64.exe' : arch === 'ia32' ? 'yt-dlp_x86.exe' : 'yt-dlp.exe';
    if(platform === 'darwin') return 'yt-dlp_macos';
    if(platform === 'linux') return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : arch === 'arm' ? 'yt-dlp_linux_armv7l' : 'yt-dlp_linux';

    // Other systems use the Python version of yt-dlp, which needs Python to be installed
    return 'yt-dlp';
}

/**
 * Runs a command and returns its output when it finished successfully
 *
 * @param {string} command Command
 * @param {Array<string>} args Arguments
 * @param {number} [timeout=60000] Time limit in milliseconds
 *
 * @returns {Promise<string | null>} Standard output, or `null` if the command failed
 * @private
 */
export function output(command: string, args: Array<string>, timeout: number = 60_000): Promise<string | null> {
    return new Promise(resolve => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout });
        let stdout = '';

        child.stdout.on('data', (chunk: Buffer) => stdout += chunk);
        child.on('error', () => resolve(null));
        child.on('close', code => resolve(code === 0 ? stdout : null));
    })
}

/**
 * Path of the binary managed by the module
 *
 * @param {YtDlpInstallOptions} options Options
 *
 * @returns {string} Path
 * @private
 */
export function binaryPath(options: YtDlpInstallOptions): string {
    return join(options.directory ?? join(homedir(), '.cache', 'discord-player-music'), assetName(options.platform ?? process.platform, options.arch ?? process.arch));
}

/**
 * Downloads the binary of the latest release, checks its checksum against the `SHA2-256SUMS` file of the release and puts it in place.
 * An unverified file is never installed.
 *
 * @param {YtDlpInstallOptions} options Options
 *
 * @throws {Error} If the file can not be downloaded or its checksum does not match
 *
 * @returns {Promise<string>} Path of the binary
 * @private
 */
async function download(options: YtDlpInstallOptions): Promise<string> {
    const platform = options.platform ?? process.platform;
    const asset = assetName(platform, options.arch ?? process.arch);
    const target = binaryPath(options);
    const baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const load = options.fetch ?? fetch;

    options.onStatus?.({ stage: 'downloading', origin: 'managed', path: target, message: `Downloading ${asset} from ${baseURL}` });

    const [binaryResponse, sumsResponse] = await Promise.all([load(`${baseURL}/${asset}`), load(`${baseURL}/SHA2-256SUMS`)]);

    if(!binaryResponse.ok) throw new Error(`Can not download ${asset}: status ${binaryResponse.status}`);
    if(!sumsResponse.ok) throw new Error(`Can not download the checksums of yt-dlp: status ${sumsResponse.status}`);

    const data = Buffer.from(await binaryResponse.arrayBuffer());
    const expected = (await sumsResponse.text()).split('\n').map(line => line.trim().split(/\s+/)).find(([, name]) => name?.replace(/^\*/, '') === asset)?.[0];

    if(!expected) throw new Error(`The checksum of ${asset} was not found in SHA2-256SUMS`);
    if(createHash('sha256').update(data).digest('hex') !== expected.toLowerCase()) throw new Error(`The checksum of the downloaded ${asset} does not match`);

    await mkdir(join(target, '..'), { recursive: true });

    const temporary = `${target}.download`;

    await writeFile(temporary, data);
    if(platform !== 'win32') await chmod(temporary, 0o755);
    await rename(temporary, target);

    return target;
}

/**
 * Finds the path of the yt-dlp binary managed by the module and downloads it when it does not exist.
 *
 * @param {YtDlpInstallOptions} [options] Options
 *
 * @throws {Error} If the file can not be downloaded or its checksum does not match
 *
 * @returns {Promise<string>} Path of the binary
 * @private
 */
export async function ensureBinary(options: YtDlpInstallOptions = {}): Promise<string> {
    const target = binaryPath(options);

    if(await stat(target).then(info => info.isFile(), () => false)) return target;

    await download(options);

    options.onStatus?.({ stage: 'installed', origin: 'managed', path: target, message: `yt-dlp was downloaded and installed: ${target}` });

    return target;
}

/**
 * Asks GitHub for the version of the latest yt-dlp release
 *
 * @param {YtDlpInstallOptions} [options] Options
 *
 * @throws {Error} If the version can not be received
 *
 * @returns {Promise<string>} Version (the tag of the release, for example `2026.10.26`)
 * @private
 */
export async function latestVersion(options: YtDlpInstallOptions = {}): Promise<string> {
    const load = options.fetch ?? fetch;
    const response = await load(options.latestURL ?? DEFAULT_LATEST_URL, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'discord-player-music' } });

    if(!response.ok) throw new Error(`GitHub responded with status ${response.status}`);

    const tag = ((await response.json()) as { tag_name?: string }).tag_name?.trim();
    if(!tag) throw new Error('GitHub did not tell the version of the latest release');

    return tag;
}

/**
 * Checks that the managed binary is the latest release and downloads the new one if it is not.
 * The check runs when the player starts (at most once per `updateInterval`). Errors are ignored: an older version still works.
 * Every step is reported with `onStatus`.
 *
 * @param {string} binary Path of the binary
 * @param {YtDlpInstallOptions} [options] Options
 *
 * @returns {Promise<boolean>} `true` if a newer version was installed
 * @private
 */
export async function updateBinary(binary: string, options: YtDlpInstallOptions = {}): Promise<boolean> {
    const report = (event: Omit<YtDlpStatusEvent, 'origin' | 'path'>) => options.onStatus?.({ origin: 'managed', path: binary, ...event });

    if(options.update === false) {
        report({ stage: 'skipped', reason: 'update-disabled', message: 'The update check is turned off (install.update is false)' });

        return false;
    }

    const interval = options.updateInterval ?? 3_600_000;
    const marker = `${binary}.checked`;
    const lastCheck = await stat(marker).then(info => info.mtimeMs, () => 0);

    if(interval > 0 && Date.now() - lastCheck < interval) {
        report({ stage: 'skipped', reason: 'interval', message: `The update check was done less than ${Math.round(interval / 60_000)} minute(s) ago, skipped` });

        return false;
    }

    // The marker is updated first: a failing check is not repeated on every start
    await writeFile(marker, new Date().toISOString());
    await utimes(marker, new Date(), new Date());

    const installed = (await output(binary, ['--version'], 20_000))?.trim();

    report({ stage: 'checking', version: installed, message: `Checking for a newer yt-dlp (installed: ${installed ?? 'unknown'})` });

    let latest: string;

    try {
        latest = await latestVersion(options);
    }catch(error) {
        report({ stage: 'skipped', reason: 'offline', version: installed, message: `The update check was skipped, GitHub can not be reached: ${(error as Error).message}` });

        return false;
    }

    if(latest === installed) {
        report({ stage: 'up-to-date', version: installed, latest, message: `yt-dlp ${installed} is up to date` });

        return false;
    }

    report({ stage: 'update-available', version: installed, latest, message: `yt-dlp ${installed ?? 'unknown'} is not the latest version, ${latest} is available, updating` });

    try {
        await download(options);

        report({ stage: 'installed', version: latest, latest, message: `yt-dlp was updated to ${latest}` });

        return true;
    }catch(error) {
        report({ stage: 'error', version: installed, latest, message: `Could not update yt-dlp (the old version is kept): ${(error as Error).message}` });

        return false;
    }
}
