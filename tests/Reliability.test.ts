import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { SourceRegistry } from '../src/sources/SourceRegistry';
import { SourceProvider } from '../src/sources/SourceProvider';
import { assetName, ensureBinary, updateBinary } from '../src/sources/YtDlpBinary';
import { YtDlpProvider } from '../src/sources/YtDlpProvider';
import { YtDlpStatusEvent } from '../src/types/PlayerData';

import { createFakeProvider, createQueue, createTestPlayer, fakeTrack, sleep, waitFor } from './helpers';

describe('SourceRegistry health', () => {
    const counting = (name: string, fails: boolean, calls: Array<string>): SourceProvider => ({
        ...createFakeProvider(),
        name,
        resolve: async url => {
            calls.push(name);

            if(fails) throw new Error(`${name} failed`);

            return { id: 'i', title: name, url, thumbnail: 't', seconds: 1, author: { name: 'a', url: 'u' }, source: name };
        }
    })

    it('moves a provider that keeps failing to the end for a while', async () => {
        const calls: Array<string> = [];
        const registry = new SourceRegistry([counting('flaky', true, calls), counting('stable', false, calls)], { failureThreshold: 3, cooldown: 60_000 });

        for(let i = 0; i < 3; i++) await registry.resolve(`https://x/${i}`);

        expect(calls).toEqual(['flaky', 'stable', 'flaky', 'stable', 'flaky', 'stable']);

        calls.length = 0;

        await registry.resolve('https://x/3');
        await registry.resolve('https://x/4');

        // The failing provider is not asked at all while the next one works
        expect(calls).toEqual(['stable', 'stable']);
    })

    it('asks the penalized provider last when the others fail, and forgets the penalty after a success', async () => {
        const calls: Array<string> = [];
        let flakyDown = true;
        let stableDown = false;

        const ok = (name: string, url: string) => ({ id: 'i', title: name, url, thumbnail: 't', seconds: 1, author: { name: 'a', url: 'u' }, source: name });
        const flaky: SourceProvider = { ...createFakeProvider(), name: 'flaky', resolve: async url => { calls.push('flaky'); if(flakyDown) throw new Error('down'); return ok('flaky', url) } };
        const stable: SourceProvider = { ...createFakeProvider(), name: 'stable', resolve: async url => { calls.push('stable'); if(stableDown) throw new Error('down'); return ok('stable', url) } };
        const registry = new SourceRegistry([flaky, stable], { failureThreshold: 1, cooldown: 60_000 });

        // flaky fails and is penalized, stable answers
        expect((await registry.resolve('https://x/1')).source).toBe('stable');

        calls.length = 0;
        flakyDown = false;
        stableDown = true;

        // flaky is asked last, but it works again
        expect((await registry.resolve('https://x/2')).source).toBe('flaky');
        expect(calls).toEqual(['stable', 'flaky']);

        calls.length = 0;

        // the success removed the penalty of flaky: it is first again, stable is penalized now
        expect((await registry.resolve('https://x/3')).source).toBe('flaky');
        expect(calls).toEqual(['flaky']);
    })

    it('uses the next provider for all the following tracks after one failure (default settings)', async () => {
        const calls: Array<string> = [];
        const picky: SourceProvider = { ...counting('picky', false, calls), resolve: async url => { calls.push('picky'); if(url.endsWith('/hard')) throw new Error('refused'); return { id: 'i', title: 'p', url, thumbnail: 't', seconds: 1, author: { name: 'a', url: 'u' }, source: 'picky' } } };
        const registry = new SourceRegistry([picky, counting('other', false, calls)]);

        // One refused video, then it does not matter which video comes next: the other provider is used first
        await registry.resolve('https://x/hard');
        expect(calls).toEqual(['picky', 'other']);

        calls.length = 0;

        await registry.resolve('https://x/hard');
        await registry.resolve('https://x/easy');
        await registry.resolve('https://x/other');
        expect(calls).toEqual(['other', 'other', 'other']);
    })

    it('does not penalize before the threshold and expires the penalty', async () => {
        const calls: Array<string> = [];
        const registry = new SourceRegistry([counting('flaky', true, calls), counting('stable', false, calls)], { failureThreshold: 2, cooldown: 50 });

        await registry.resolve('https://x/1');
        await registry.resolve('https://x/2');

        calls.length = 0;

        await sleep(80);
        await registry.resolve('https://x/3');

        expect(calls).toEqual(['flaky', 'stable']);
    })
})

describe('Next track preparation', () => {
    it('creates the stream of the next track before the current one ends and uses it', async () => {
        const t = createTestPlayer({ prefetchSeconds: 20 });
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);

        // The tracks last 1 second, so the next one is prepared immediately, long before the first one ends
        await waitFor(() => t.provider.log.some(line => line.includes('v=b')));
        expect(t.events).not.toContain('playingTrack b');

        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        // Track b was requested only once: the prepared stream was used when its turn came
        expect(t.provider.log.filter(line => line.includes('v=b'))).toHaveLength(1);
        expect(t.events).toContain('playingTrack b');

        t.cleanup();
    })

    it('does nothing when it is disabled', async () => {
        const t = createTestPlayer({ prefetchSeconds: 0 });
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await sleep(300);

        expect(t.provider.log.some(line => line.includes('v=b'))).toBe(false);

        await t.player.queue.stop('G');
        t.cleanup();
    })

    it('drops the prepared stream when the queue changes and prepares the right one', async () => {
        const t = createTestPlayer({ prefetchSeconds: 20 });
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b'), fakeTrack('c')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.provider.log.some(line => line.includes('v=b')));

        await t.player.queue.removeTrack('G', 1);
        await waitFor(() => t.provider.log.some(line => line.includes('v=c')));

        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(t.events).toContain('playingTrack c');
        expect(t.events).not.toContain('playingTrack b');

        t.cleanup();
    })

    it('falls back to a normal stream when the prepared one failed', async () => {
        const t = createTestPlayer({ prefetchSeconds: 20 });
        let first = true;
        const original = t.provider.stream;

        t.provider.stream = async (url, options) => {
            if(url.endsWith('b') && first) {
                first = false;

                throw new Error('temporary failure');
            }

            return original(url, options);
        }

        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(t.events).toContain('playingTrack b');
        expect(t.events.some(event => event.startsWith('error'))).toBe(false);

        t.cleanup();
    })
})

describe('Automatic yt-dlp installation', () => {
    let server: Server | undefined;
    let dir: string | undefined;

    afterEach(() => {
        server?.close();
        server = undefined;

        if(dir) rmSync(dir, { recursive: true, force: true });
        dir = undefined;
    })

    const serve = async (files: Record<string, string>): Promise<string> => {
        server = createServer((request, response) => {
            const body = files[request.url?.slice(1) ?? ''];

            if(body === undefined) {
                response.statusCode = 404;

                return response.end();
            }

            response.end(body);
        })

        await new Promise<void>(resolve => server?.listen(0, '127.0.0.1', resolve));

        return `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
    }

    const sha = (text: string) => createHash('sha256').update(text).digest('hex');

    it('chooses the release file for the platform', () => {
        expect(assetName('win32', 'x64')).toBe('yt-dlp.exe');
        expect(assetName('win32', 'arm64')).toBe('yt-dlp_arm64.exe');
        expect(assetName('linux', 'x64')).toBe('yt-dlp_linux');
        expect(assetName('linux', 'arm64')).toBe('yt-dlp_linux_aarch64');
        expect(assetName('darwin', 'arm64')).toBe('yt-dlp_macos');
        expect(assetName('freebsd', 'x64')).toBe('yt-dlp');
    })

    it('downloads the binary, checks its checksum and does not download it twice', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const baseURL = await serve({ 'yt-dlp_linux': 'binary content', 'SHA2-256SUMS': `${sha('binary content')}  yt-dlp_linux\n${sha('other')}  yt-dlp\n` });
        const events: Array<YtDlpStatusEvent> = [];
        const options = { directory: dir, baseURL, platform: 'linux', arch: 'x64', onStatus: (event: YtDlpStatusEvent) => events.push(event) };

        const path = await ensureBinary(options);

        expect(path).toBe(join(dir, 'yt-dlp_linux'));
        expect(readFileSync(path, 'utf-8')).toBe('binary content');
        expect(existsSync(`${path}.download`)).toBe(false);
        expect(statSync(path).mode & 0o111).not.toBe(process.platform === 'win32' ? -1 : 0);
        expect(events.map(event => event.stage)).toEqual(['downloading', 'installed']);
        expect(events[0]).toMatchObject({ origin: 'managed', path, message: expect.stringContaining('Downloading yt-dlp_linux') });

        events.length = 0;
        server?.close();

        // The second call finds the file and needs no network
        expect(await ensureBinary(options)).toBe(path);
        expect(events).toEqual([]);
    })

    it('refuses a binary with a wrong or missing checksum', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const baseURL = await serve({ 'yt-dlp_linux': 'tampered', 'SHA2-256SUMS': `${sha('original')}  yt-dlp_linux\n`, 'yt-dlp_macos': 'x', 'SHA2-256SUMS-missing': '' });

        await expect(ensureBinary({ directory: dir, baseURL, platform: 'linux', arch: 'x64' })).rejects.toThrow(/does not match/);
        expect(existsSync(join(dir, 'yt-dlp_linux'))).toBe(false);
        await expect(ensureBinary({ directory: dir, baseURL, platform: 'darwin', arch: 'arm64' })).rejects.toThrow(/not found in SHA2-256SUMS/);
    })

    it('reports download errors', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const baseURL = await serve({});

        await expect(ensureBinary({ directory: dir, baseURL, platform: 'linux', arch: 'x64' })).rejects.toThrow(/status 404/);
    })

    it('installs a newer version when the player starts (and only when it differs), at most once per interval', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const files: Record<string, string> = { 'yt-dlp_linux': 'new binary', 'SHA2-256SUMS': `${sha('new binary')}  yt-dlp_linux\n` };
        const baseURL = await serve({ ...files, 'latest': JSON.stringify({ tag_name: '2099.01.01' }) });
        const events: Array<YtDlpStatusEvent> = [];

        // The installed binary is a script that prints its version
        const { writeFile } = await import('node:fs/promises');
        const binary = join(dir, 'yt-dlp_linux');

        await writeFile(binary, process.platform === 'win32' ? '' : '#!/bin/sh\necho 2020.01.01\n', { mode: 0o755 });

        const options = { directory: dir, baseURL, latestURL: `${baseURL}/latest`, platform: 'linux', arch: 'x64', updateInterval: 60_000, onStatus: (event: YtDlpStatusEvent) => events.push(event) };

        // On Windows the stub can not print a version: the update logic is the same, only the version check differs
        const updated = await updateBinary(binary, options);

        expect(updated).toBe(true);
        expect(readFileSync(binary, 'utf-8')).toBe('new binary');
        expect(events.map(event => event.stage)).toEqual(['checking', 'update-available', 'downloading', 'installed']);
        expect(events[1]).toMatchObject({ latest: '2099.01.01', message: expect.stringContaining('2099.01.01 is available') });
        expect(events[3]).toMatchObject({ version: '2099.01.01', message: 'yt-dlp was updated to 2099.01.01' });
        expect(existsSync(`${binary}.checked`)).toBe(true);

        // A second start inside the interval does not ask GitHub again
        events.length = 0;

        expect(await updateBinary(binary, options)).toBe(false);
        expect(events).toEqual([{ stage: 'skipped', reason: 'interval', origin: 'managed', path: binary, message: expect.stringContaining('skipped') }]);
    })

    it('does not download anything when the binary is the latest version or the check is disabled', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const baseURL = await serve({ 'latest': JSON.stringify({ tag_name: '2020.01.01' }) });
        const { writeFile } = await import('node:fs/promises');
        const binary = join(dir, 'yt-dlp_linux');

        await writeFile(binary, process.platform === 'win32' ? '' : '#!/bin/sh\necho 2020.01.01\n', { mode: 0o755 });

        const options = { directory: dir, baseURL, latestURL: `${baseURL}/latest`, platform: 'linux', arch: 'x64', updateInterval: 0 };

        expect(await updateBinary(binary, options)).toBe(false);
        expect(await updateBinary(binary, { ...options, update: false })).toBe(false);
        expect(readFileSync(binary, 'utf-8')).not.toBe('new binary');
    })

    it('keeps the old binary when the update fails', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const baseURL = await serve({ 'latest': JSON.stringify({ tag_name: '2099.01.01' }), 'yt-dlp_linux': 'broken', 'SHA2-256SUMS': `${sha('something else')}  yt-dlp_linux\n` });
        const { writeFile } = await import('node:fs/promises');
        const binary = join(dir, 'yt-dlp_linux');
        const events: Array<YtDlpStatusEvent> = [];

        await writeFile(binary, 'old');

        expect(await updateBinary(binary, { directory: dir, baseURL, latestURL: `${baseURL}/latest`, platform: 'linux', arch: 'x64', updateInterval: 0, onStatus: event => events.push(event) })).toBe(false);
        expect(readFileSync(binary, 'utf-8')).toBe('old');
        expect(events.map(event => event.stage)).toEqual(['checking', 'update-available', 'downloading', 'error']);
        expect(events.at(-1)?.message).toContain('Could not update yt-dlp (the old version is kept)');
    })

    it('reports that the check is turned off and that GitHub can not be reached', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const { writeFile } = await import('node:fs/promises');
        const binary = join(dir, 'yt-dlp_linux');

        await writeFile(binary, 'old');

        const events: Array<YtDlpStatusEvent> = [];
        const base = { directory: dir, platform: 'linux', arch: 'x64', updateInterval: 0, onStatus: (event: YtDlpStatusEvent) => events.push(event) };

        await updateBinary(binary, { ...base, update: false });

        expect(events).toEqual([{ stage: 'skipped', reason: 'update-disabled', origin: 'managed', path: binary, message: expect.stringContaining('turned off') }]);

        events.length = 0;

        // The address of the latest version is not reachable (nothing listens on it)
        await updateBinary(binary, { ...base, latestURL: 'http://127.0.0.1:1/latest' });

        expect(events.map(event => event.stage)).toEqual(['checking', 'skipped']);
        expect(events[1]).toMatchObject({ reason: 'offline', message: expect.stringContaining('GitHub can not be reached') });
    })

    it('reports the steps of a yt-dlp that is given with the command option', async () => {
        const script = fileURLToPath(new URL('./fixtures/fake-ytdlp.mjs', import.meta.url));
        const events: Array<YtDlpStatusEvent> = [];
        const provider = new YtDlpProvider({ command: process.execPath, args: [script], install: { onStatus: event => events.push(event) } });

        await provider.prepare();

        expect(events.map(event => event.stage)).toEqual(['found', 'skipped']);
        expect(events[0]).toMatchObject({ origin: 'command', path: process.execPath });
        expect(events[1]).toMatchObject({ reason: 'custom-command' });
    })

    // The stub of the binary is a shell script, which Windows can not run
    it.skipIf(process.platform === 'win32')('reports a downloaded yt-dlp: found, up to date', async () => {
        dir = mkdtempSync(join(tmpdir(), 'dpm-ytdlp-'));

        const { writeFile } = await import('node:fs/promises');
        const binary = join(dir, 'yt-dlp_linux');
        const baseURL = await serve({ 'latest': JSON.stringify({ tag_name: '2020.01.01' }) });

        await writeFile(binary, process.platform === 'win32' ? '' : '#!/bin/sh\necho 2020.01.01\n', { mode: 0o755 });

        // lookupPath: false, so the downloaded binary of the folder is used
        const events: Array<YtDlpStatusEvent> = [];
        const provider = new YtDlpProvider({ lookupPath: false, install: { directory: dir, platform: 'linux', arch: 'x64', baseURL, latestURL: `${baseURL}/latest`, updateInterval: 0, onStatus: event => events.push(event) } });
        const seen: Array<YtDlpStatusEvent> = [];

        provider.onStatus = event => seen.push(event);

        await provider.prepare();

        expect(events.map(event => event.stage)).toEqual(['found', 'checking', 'up-to-date']);
        expect(events[0]).toMatchObject({ origin: 'managed', path: binary });

        // The `onStatus` property of the provider (the player sets it) gets the same events
        expect(seen.map(event => event.stage)).toEqual(events.map(event => event.stage));
    })

    it('can be disabled: a missing yt-dlp is reported instead of downloaded', async () => {
        const provider = new YtDlpProvider({ autoInstall: false, env: { PATH: '' } });

        // yt-dlp is not found by name in an empty PATH (when it is not installed in the system folders either)
        await expect(provider.resolve('https://www.youtube.com/watch?v=abcdefghijk')).rejects.toThrow();
    })
})
