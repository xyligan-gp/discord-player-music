import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const created: Array<Record<string, unknown>> = [];

// yt-dlp is never downloaded or started by these tests
vi.mock('../src/sources/YtDlpBinary', () => ({ assetName: () => 'yt-dlp', output: async () => null, succeeds: async () => false, ensureBinary: async () => '/mock/yt-dlp', updateBinary: async () => false }));

// youtubei.js is replaced to see how the session is created
vi.mock('youtubei.js', () => ({
    Innertube: {
        create: vi.fn(async (options: Record<string, unknown>) => {
            created.push(options);

            // An anonymous session: the age-restricted video needs a login. A signed-in session (with cookies) can read its information.
            return { getBasicInfo: async () => options.cookie ? { playability_status: { status: 'OK' }, basic_info: { title: 'Age restricted', duration: 5, author: 'Author', channel_id: 'C' } } : { playability_status: { status: 'LOGIN_REQUIRED' } } }
        })
    },
    UniversalCache: class { }
}));

import { cookieHeader, parseCookies, readYouTubeCookies } from '../src/sources/cookies';
import { YoutubeiProvider } from '../src/sources/YoutubeiProvider';
import { YtDlpProvider } from '../src/sources/YtDlpProvider';

import { createTestPlayer, waitFor } from './helpers';

const future = Math.floor(Date.now() / 1000) + 86_400;
const past = Math.floor(Date.now() / 1000) - 86_400;

const FILE = [
    '# Netscape HTTP Cookie File',
    '',
    `.youtube.com\tTRUE\t/\tTRUE\t${future}\tSID\tabc123`,
    `#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t${future}\t__Secure-1PSID\tsecret=value`,
    `.google.com\tTRUE\t/\tTRUE\t${future}\tOTHER\tnot-for-youtube`,
    `.youtube.com\tTRUE\t/\tTRUE\t${past}\tOLD\texpired`,
    `youtube.com\tFALSE\t/\tFALSE\t0\tSESSION\tkept`,
    'broken line without tabs'
].join('\n');

let dir: string | undefined;

afterEach(() => {
    created.length = 0;

    if(dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
});

const cookiesFile = (content: string): string => {
    dir = mkdtempSync(join(tmpdir(), 'dpm-cookies-'));

    const path = join(dir, 'cookies.txt');

    writeFileSync(path, content);

    return path;
}

describe('cookies file', () => {
    it('parses the Netscape format, including HttpOnly cookies', () => {
        const cookies = parseCookies(FILE);

        expect(cookies.map(cookie => cookie.name)).toEqual(['SID', '__Secure-1PSID', 'OTHER', 'OLD', 'SESSION']);
        expect(cookies[1].value).toBe('secret=value');
    })

    it('builds the header only from the unexpired cookies of the site', () => {
        expect(cookieHeader(parseCookies(FILE), 'youtube.com')).toBe('SID=abc123; __Secure-1PSID=secret=value; SESSION=kept');
        expect(cookieHeader(parseCookies(FILE), 'www.youtube.com')).toContain('SID=abc123');
        expect(cookieHeader(parseCookies(FILE), 'example.com')).toBe('');
    })

    it('reads a file and reports problems clearly', async () => {
        expect(await readYouTubeCookies(cookiesFile(FILE))).toBe('SID=abc123; __Secure-1PSID=secret=value; SESSION=kept');

        await expect(readYouTubeCookies(join(tmpdir(), 'dpm-no-such-cookies.txt'))).rejects.toThrow(/Can not read the cookies file/);
        await expect(readYouTubeCookies(cookiesFile('# only a comment'))).rejects.toThrow(/no valid cookies of youtube.com/);
    })
})

describe('one cookies file for both providers', () => {
    it('gives the cookies to youtubei.js in a separate signed-in session (the iOS client, which plays the audio, does not accept cookies)', async () => {
        await new YoutubeiProvider({ cookies: cookiesFile(FILE) }).prepare();

        expect(created).toHaveLength(2);
        expect(created[0]).toMatchObject({ generate_session_locally: true });
        expect(created[0].cookie).toBeUndefined();
        expect(created[1]).toMatchObject({ cookie: 'SID=abc123; __Secure-1PSID=secret=value; SESSION=kept', generate_session_locally: false });
    })

    it('reads the information of an age-restricted video with the signed-in session', async () => {
        const url = 'https://www.youtube.com/watch?v=abcdefghijk';

        expect(await new YoutubeiProvider({ cookies: cookiesFile(FILE) }).resolve(url)).toMatchObject({ title: 'Age restricted', seconds: 5, author: { name: 'Author' } });
        await expect(new YoutubeiProvider().resolve(url)).rejects.toThrow(/LOGIN_REQUIRED/);
    })

    it('uses a locally generated session without cookies', async () => {
        await new YoutubeiProvider().prepare();

        expect(created).toHaveLength(1);
        expect(created[0]).toMatchObject({ generate_session_locally: true });
        expect(created[0].cookie).toBeUndefined();
    })

    it('fails to prepare when the cookies file is missing, and tries again next time', async () => {
        const provider = new YoutubeiProvider({ cookies: join(tmpdir(), 'dpm-no-such-cookies.txt') });

        await expect(provider.prepare()).rejects.toThrow(/Can not read the cookies file/);
        await expect(provider.prepare()).rejects.toThrow(/Can not read the cookies file/);

        // Only the anonymous session was made (once: it is kept)
        expect(created).toHaveLength(1);
    })

    it('gives the same file to yt-dlp (--cookies)', async () => {
        const script = fileURLToPath(new URL('./fixtures/fake-ytdlp.mjs', import.meta.url));
        const track = await new YtDlpProvider({ command: process.execPath, args: [script], cookies: '/data/cookies.txt' }).resolve('https://www.youtube.com/watch?v=abcdefghijk');

        // The fake yt-dlp returns the path after --cookies as the author
        expect(track.author.name).toBe('/data/cookies.txt');
    })

    it('Player passes its cookies option to both default providers', async () => {
        const path = cookiesFile(FILE);
        const t = createTestPlayer({ sources: undefined, cookies: path });

        await waitFor(() => created.length > 0);

        const [youtubei, ytdlp] = t.player.sources.list as unknown as Array<{ name: string, options: { cookies?: string, extraArgs?: Array<string> } }>;

        expect([youtubei.name, ytdlp.name]).toEqual(['youtubei', 'yt-dlp']);
        expect(youtubei.options.cookies).toBe(path);
        expect(ytdlp.options.extraArgs).toEqual(['--cookies', path]);
        expect(created.some(options => options.cookie === 'SID=abc123; __Secure-1PSID=secret=value; SESSION=kept')).toBe(true);

        t.cleanup();
    })
})
