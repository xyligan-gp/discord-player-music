// Integration tests with the real YouTube: they check that the providers still work.
// They are not a part of `npm test` (YouTube changes often), run them with `npm run test:integration`.
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { YoutubeiProvider } from '../../src/sources/YoutubeiProvider';
import { YtDlpProvider } from '../../src/sources/YtDlpProvider';
import { SourceProvider } from '../../src/sources/SourceProvider';

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const ytDlpCommand = process.env.YT_DLP ?? 'yt-dlp';
const ytDlpAvailable = spawnSync(ytDlpCommand, ['--version']).status === 0;

/**
 * Reads the first bytes of the stream and checks that it is an Ogg Opus stream
 */
async function readStart(provider: SourceProvider): Promise<void> {
    const stream = await provider.stream(VIDEO);
    const chunks: Array<Buffer> = [];
    let size = 0;

    await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
            size += chunk.length;

            if(size >= 50_000) {
                stream.destroy();
                resolve();
            }
        })

        stream.on('error', reject);
        stream.on('close', resolve);
    })

    expect(size).toBeGreaterThanOrEqual(50_000);
    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe('OggS');
}

describe.each([
    ['youtubei', () => new YoutubeiProvider(), true],
    ['yt-dlp', () => new YtDlpProvider({ command: ytDlpCommand }), ytDlpAvailable]
] as const)('%s provider with the real YouTube', (_name, create, enabled) => {
    it.skipIf(!enabled)('searches', async () => {
        const tracks = await create().search('Never Gonna Give You Up', 3);

        expect(tracks.length).toBeGreaterThan(0);
        expect(tracks[0].url).toContain('youtube.com/watch?v=');
    })

    it.skipIf(!enabled)('resolves a video', async () => {
        const track = await create().resolve(VIDEO);

        expect(track.title.toLowerCase()).toContain('never gonna give you up');
        expect(track.seconds).toBeGreaterThan(200);
    })

    it.skipIf(!enabled)('loads a playlist', async () => {
        const playlist = await create().resolvePlaylist!('https://www.youtube.com/playlist?list=PLp_G0HWfCo5raQSCb_BxY6oA1OVnNBolc', 5);

        expect(playlist.tracks).toHaveLength(5);
        expect(playlist.tracks[0].url).toContain('youtube.com/watch?v=');
    })

    it.skipIf(!enabled)('streams Opus audio', async () => {
        await readStart(create());
    }, 60_000)
})
