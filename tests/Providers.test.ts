import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LrclibProvider } from '../src/lyrics/LrclibProvider';
import { YtDlpProvider } from '../src/sources/YtDlpProvider';
import { YoutubeiProvider } from '../src/sources/YoutubeiProvider';

afterEach(() => { vi.unstubAllGlobals() });

describe('LrclibProvider', () => {
    const respond = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

    it('picks the result that matches the query best and skips instrumentals', async () => {
        respond([
            { artistName: 'Other', trackName: 'Something', plainLyrics: 'wrong' },
            { artistName: 'Imagine Dragons', trackName: 'Thunder', instrumental: true, plainLyrics: 'instrumental' },
            { artistName: 'Imagine Dragons', trackName: 'Thunder', plainLyrics: '  Thunder, thunder  ' }
        ]);

        const result = await new LrclibProvider().search('Imagine Dragons Thunder');

        expect(result).toEqual({ text: 'Thunder, thunder', title: 'Thunder', artist: 'Imagine Dragons', source: 'lrclib' });
    })

    it('returns null when there are no lyrics', async () => {
        respond([{ artistName: 'A', trackName: 'B', plainLyrics: null }]);

        expect(await new LrclibProvider().search('A B')).toBeNull();
    })

    it('sends the user agent and the encoded query to the configured server', async () => {
        respond([]);

        await new LrclibProvider({ baseURL: 'https://example.org/', userAgent: 'test-agent' }).search('a b&c');

        const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];

        expect(url).toBe('https://example.org/api/search?q=a%20b%26c');
        expect((init.headers as Record<string, string>)['user-agent']).toBe('test-agent');
    })

    it('throws when the service fails', async () => {
        respond({}, 500);

        await expect(new LrclibProvider().search('x')).rejects.toThrow(/status 500/);
    })
})

describe('YtDlpProvider', () => {
    const script = fileURLToPath(new URL('./fixtures/fake-ytdlp.mjs', import.meta.url));
    const provider = () => new YtDlpProvider({ command: process.execPath, args: [script] });

    it('handles YouTube URLs only', () => {
        expect(provider().canHandle('https://www.youtube.com/watch?v=abcdefghijk')).toBe(true);
        expect(provider().canHandle('https://youtu.be/abcdefghijk')).toBe(true);
        expect(provider().canHandle('https://soundcloud.com/x')).toBe(false);
    })

    it('searches', async () => {
        const tracks = await provider().search('query', 2);

        expect(tracks).toHaveLength(2);
        expect(tracks[0]).toMatchObject({ id: 'search1__', title: 'Result 1', seconds: 101, url: 'https://www.youtube.com/watch?v=search1__', source: 'yt-dlp', author: { name: 'Channel' } });
    })

    it('resolves', async () => {
        expect(await provider().resolve('https://www.youtube.com/watch?v=abcdefghijk')).toMatchObject({ id: 'abcdefghijk', title: 'Resolved', seconds: 42, author: { name: 'Uploader' } });
    })

    it('loads playlists without private videos and respects the limit', async () => {
        const loader = provider();

        expect(loader.isPlaylist('https://www.youtube.com/playlist?list=PLabcdefghij123')).toBe(true);
        expect(loader.isPlaylist('https://www.youtube.com/watch?v=abcdefghijk')).toBe(false);

        const playlist = await loader.resolvePlaylist('https://www.youtube.com/watch?v=abcdefghijk&list=PLabcdefghij123', 100);

        expect(playlist).toMatchObject({ id: 'PLabcdefghij123', title: 'My playlist', url: 'https://www.youtube.com/playlist?list=PLabcdefghij123', source: 'yt-dlp' });
        expect(playlist.tracks.map(track => track.id)).toEqual(['plvideo1__', 'plvideo2__', 'plvideo4__']);
        expect((await loader.resolvePlaylist('https://www.youtube.com/playlist?list=PLabcdefghij123', 1)).tracks).toHaveLength(1);
    })

    it('reports yt-dlp failures with its message', async () => {
        await expect(provider().resolve('https://www.youtube.com/watch?v=fail')).rejects.toThrow(/code 1: ERROR: Video unavailable/);
    })

    it('reports a failure of the stream before it is returned and explains the sign-in request', async () => {
        await expect(provider().stream('https://www.youtube.com/watch?v=fail')).rejects.toThrow(/yt-dlp failed: ERROR: Video unavailable/);
        await expect(provider().stream('https://www.youtube.com/watch?v=signin')).rejects.toThrow(/Sign in to confirm.*`cookies` option/);
        await expect(provider().resolve('https://www.youtube.com/watch?v=signin')).rejects.toThrow(/`cookies` option/);
    })

    it('returns the stream as soon as yt-dlp gives audio', async () => {
        const stream = await provider().stream('https://www.youtube.com/watch?v=abcdefghijk');

        expect(stream.readable).toBe(true);

        stream.destroy();
    })

    it('prepares itself ahead of time', async () => {
        await expect(provider().prepare()).resolves.toBeUndefined();
        await expect(new YtDlpProvider({ autoInstall: false, lookupPath: false }).prepare()).rejects.toThrow(/not installed/);
    })

    it('reports a missing executable', async () => {
        await expect(new YtDlpProvider({ command: 'definitely-not-installed-yt-dlp' }).stream('https://youtu.be/abcdefghijk')).rejects.toThrow(/ENOENT/);
    })
})

describe('YouTube playlist links', () => {
    it.each([
        ['https://www.youtube.com/playlist?list=PLp_G0HWfCo5raQSCb_BxY6oA1OVnNBolc', true],
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLp_G0HWfCo5raQSCb_BxY6oA1OVnNBolc&index=2', true],
        ['https://music.youtube.com/playlist?list=OLAK5uy_abcdefghijk', true],
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ', false],
        ['https://www.youtube.com/playlist?list=WL', false],
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', false],
        ['https://example.com/playlist?list=PLp_G0HWfCo5raQSCb_BxY6oA1OVnNBolc', false],
        ['PLp_G0HWfCo5raQSCb_BxY6oA1OVnNBolc', false]
    ])('%s -> %s', (url, expected) => {
        expect(new YoutubeiProvider().isPlaylist(url)).toBe(expected);
        expect(new YtDlpProvider().isPlaylist(url)).toBe(expected);
    })
})

describe('YoutubeiProvider', () => {
    it('recognizes YouTube links', () => {
        const provider = new YoutubeiProvider();

        expect(provider.canHandle('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
        expect(provider.canHandle('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
        expect(provider.canHandle('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
        expect(provider.canHandle('https://example.com/watch?v=dQw4w9WgXcQ')).toBe(false);
        expect(provider.canHandle('not a url')).toBe(false);
    })
})
