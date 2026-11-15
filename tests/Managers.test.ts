import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PlayerError, PlayerErrorCode } from '../src/PlayerError';
import { Search } from '../src/PlayerEnums';

import { fileURLToPath } from 'node:url';

import { YtDlpProvider } from '../src/sources/YtDlpProvider';

import { createFakeProvider, createTestPlayer, TestPlayer } from './helpers';

let t: TestPlayer;

beforeEach(() => { t = createTestPlayer() });
afterEach(() => t.cleanup());

const code = async (promise: Promise<unknown>) => promise.then(() => 'no error', (error: PlayerError) => error.code);

describe('FiltersManager', () => {
    it('has the built-in filters', async () => {
        expect(await t.player.filters.isExists('bassboost')).toBe(true);
        expect((await t.player.filters.get('nightcore')).value).toBeTruthy();
    })

    it('adds and deletes filters', async () => {
        expect(await t.player.filters.add('quiet', 'volume=0.5')).toEqual({ status: true });
        expect(await code(t.player.filters.add('quiet', 'volume=0.5'))).toBe(PlayerErrorCode.FILTER_EXISTS);
        expect(await t.player.filters.delete('quiet')).toEqual({ status: true });
        expect(await code(t.player.filters.get('quiet'))).toBe(PlayerErrorCode.FILTER_NOT_FOUND);
        expect(await code(t.player.filters.delete('quiet'))).toBe(PlayerErrorCode.FILTER_NOT_FOUND);
    })
})

describe('UtilsManager', () => {
    it('formats numbers and durations', () => {
        expect(t.player.utils.formatnumbers([1, 10, 5])).toEqual(['01', '10', '05']);
        expect(t.player.utils.formatDuration(307)).toBe('00:05:07');
        expect(t.player.utils.formatDuration(3725)).toBe('01:02:05');
    })

    it('builds the empty progress bar', () => {
        expect(t.player.utils.createEmptyProgress()).toBe('🔘' + '▬'.repeat(10));
    })

    it('fills missing or invalid options with defaults', () => {
        const options = t.player.utils.checkOptions({ searchResultsLimit: -3, defaultVolume: 'loud' as never, synchronLoop: false, progressConfig: { size: 5 } });

        expect(options.searchResultsLimit).toBe(10);
        expect(options.defaultVolume).toBe(5);
        expect(options.synchronLoop).toBe(false);
        expect(options.progressConfig).toEqual({ size: 5, line: '▬', slider: '🔘' });
        expect(options.collectorsConfig.reaction.reactions).toHaveLength(10);
    })

    it('reads the track duration from the providers', async () => {
        expect(await t.player.utils.getTrackDuration('https://youtu.be/x')).toBe(125);
    })
})

describe('Player', () => {
    const member = (inVoice = true) => ({ user: { id: 'U' }, guild: { id: 'G', voiceAdapterCreator: () => ({ sendPayload: () => true, destroy: () => { } }) }, voice: { channel: inVoice ? { id: 'V' } : null } }) as never;
    const channel = { id: 'T' } as never;

    it('searches tracks by title and limits the results', async () => {
        const other = createTestPlayer({ searchResultsLimit: 2 });
        const results = await other.player.search('query', member(), channel);

        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({ index: 1, searchType: Search.TITLE, title: 'query 1', source: 'fake', duration: { hours: '00', minutes: '01', seconds: '00' } });

        other.cleanup();
    })

    it('resolves links without adding them when autoAddingTracks is disabled', async () => {
        const other = createTestPlayer({ autoAddingTracks: false });
        const results = await other.player.search('https://www.youtube.com/watch?v=abcdefghijk', member(), channel);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ searchType: Search.URL, title: 'Resolved', duration: { minutes: '02', seconds: '05' } });
        expect(other.player.queue.size).toBe(0);

        other.cleanup();
    })

    it('adds all tracks of a playlist link to the queue and starts playing them', async () => {
        const other = createTestPlayer();
        const results = await other.player.search('https://www.youtube.com/playlist?list=PLabc', member(), channel);

        expect(results).toHaveLength(5);
        expect(results.map(track => track.searchType)).toEqual(Array(5).fill(Search.PLAYLIST));
        expect(results[0]).toMatchObject({ title: 'Playlist p1', source: 'fake', duration: { seconds: '01' } });

        expect(other.events).toContain('queueStarted');
        expect(other.events.filter(event => event.startsWith('addedTrack'))).toEqual(['addedTrack Playlist p2', 'addedTrack Playlist bad3', 'addedTrack Playlist p4', 'addedTrack Playlist p5']);
        expect((await other.player.queue.get('G')).tracks.map(track => track.title)).toEqual(['Playlist p1', 'Playlist p2', 'Playlist bad3', 'Playlist p4', 'Playlist p5']);

        await other.player.queue.stop('G').catch(() => { });
        other.cleanup();
    })

    it('limits the playlist and does not add it when autoAddingTracks is disabled', async () => {
        const other = createTestPlayer({ playlistLimit: 2, autoAddingTracks: false });
        const results = await other.player.search('https://www.youtube.com/playlist?list=PLabc', member(), channel);

        expect(results).toHaveLength(2);
        expect(other.player.queue.size).toBe(0);

        other.cleanup();
    })

    it('reports a playlist that can not be loaded', async () => {
        t.provider.resolvePlaylist = async () => { throw new Error('private playlist') };

        expect(await code(t.player.search('https://www.youtube.com/playlist?list=PLabc', member(), channel))).toBe(PlayerErrorCode.TRACK_NOT_FOUND);
    })

    it('validates the search parameters', async () => {
        expect(await code(t.player.search('', member(), channel))).toBe(PlayerErrorCode.MISSING_PARAMETER);
        expect(await code(t.player.search('q', member(false), channel))).toBe(PlayerErrorCode.USER_NOT_IN_VOICE);
    })

    it('says that the cookies are needed when YouTube asks to sign in', async () => {
        t.provider.search = async () => { throw new Error('yt-dlp failed: ERROR: Sign in to confirm your age') };
        t.provider.resolve = async () => { throw new Error('Video is not playable (LOGIN_REQUIRED)') };

        expect(await code(t.player.search('some video', member(), channel))).toBe(PlayerErrorCode.SIGN_IN_REQUIRED);
        expect(await code(t.player.search('https://www.youtube.com/watch?v=abcdefghijk', member(), channel))).toBe(PlayerErrorCode.SIGN_IN_REQUIRED);

        t.provider.search = async () => { throw new Error('network down') };

        expect(await code(t.player.search('some video', member(), channel))).toBe(PlayerErrorCode.TRACK_NOT_FOUND);
    })

    it('reports tracks that were not found', async () => {
        t.provider.search = async () => [];

        expect(await code(t.player.search('nothing', member(), channel))).toBe(PlayerErrorCode.TRACK_NOT_FOUND);
    })

    it('finds lyrics with the lyrics provider', async () => {
        const other = createTestPlayer({ lyrics: { name: 'fake', search: async query => query === 'known' ? { text: 'la la', title: 'T', artist: 'A', source: 'fake' } : null } });

        expect(await other.player.lyrics('known')).toEqual({ query: 'known', result: 'la la', title: 'T', artist: 'A', source: 'fake' });
        expect(await code(other.player.lyrics('unknown'))).toBe(PlayerErrorCode.LYRICS_NOT_FOUND);

        other.cleanup();
    })

    it('prepares its providers in the background and reports a failure with the error event', async () => {
        const prepared: Array<string> = [];
        const good = { ...createFakeProvider(), name: 'good', prepare: async () => { prepared.push('good') } };
        const bad = { ...createFakeProvider(), name: 'bad', prepare: async () => { throw new Error('no network') } };
        const other = createTestPlayer({ sources: [good, bad] });

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(prepared).toEqual(['good']);
        expect(other.events.some(event => event.startsWith('error') && event.includes('no network'))).toBe(true);

        other.cleanup();
    })

    it('emits the ytdlpStatus event for the steps of yt-dlp', async () => {
        const script = fileURLToPath(new URL('./fixtures/fake-ytdlp.mjs', import.meta.url));
        const other = createTestPlayer({ sources: [new YtDlpProvider({ command: process.execPath, args: [script] })] });
        const stages: Array<string> = [];

        other.player.on('ytdlpStatus', event => stages.push(`${event.stage}:${event.origin}`));

        await new Promise(resolve => setTimeout(resolve, 500));

        expect(stages).toEqual(['found:command', 'skipped:command']);

        other.cleanup();
    })

    it('has an own event emitter per instance', () => {
        const other = createTestPlayer();
        const received: Array<string> = [];

        other.player.on('addedTrack', track => received.push(track.title));
        t.player.emit('addedTrack', fakeTitle('x'));

        expect(received).toEqual([]);

        other.cleanup();
    })

    it('prints an error event without listeners instead of throwing', () => {
        const other = createTestPlayer();

        other.player.removeAllListeners('error');

        expect(() => other.player.emit('error', { method: 'test', error: new Error('x') })).not.toThrow();

        other.cleanup();
    })
})

function fakeTitle(title: string) {
    return { title } as never;
}

describe('PlayerError', () => {
    it('has a code, a status and a formatted message', () => {
        const error = new PlayerError(PlayerErrorCode.QUEUE_NOT_FOUND, { id: '123' });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('PlayerError');
        expect(error.code).toBe('QUEUE_NOT_FOUND');
        expect(error.status).toBe(404);
        expect(error.message).toContain("'123'");
    })

    it('keeps the cause', () => {
        const cause = new Error('original');

        expect(new PlayerError(PlayerErrorCode.TRACK_NOT_FOUND, { data: 'x' }, cause).cause).toBe(cause);
    })
})

describe('checkOptions warnings', () => {
    const run = (options: Parameters<typeof t.player.utils.checkOptions>[0]) => {
        const messages: Array<string> = [];
        const original = console.warn;

        console.warn = (...args: Array<unknown>) => { messages.push(args.join(' ')) };

        try {
            return { options: t.player.utils.checkOptions(options), messages };
        }finally {
            console.warn = original;
        }
    }

    it('warns about an option that was passed but is invalid, and uses the default', () => {
        const { options, messages } = run({ collectorsConfig: { message: { time: 60000 as never } }, searchResultsLimit: -3, defaultVolume: 'loud' as never });

        expect(options.collectorsConfig.message.time).toBe('1m');
        expect(options.searchResultsLimit).toBe(10);
        expect(options.defaultVolume).toBe(5);
        expect(messages).toHaveLength(3);
        expect(messages.some(message => message.includes('Option "collectorsConfig.message.time" is invalid') && message.includes('60000') && message.includes('using "1m" instead'))).toBe(true);
        expect(messages.some(message => message.includes('Option "searchResultsLimit" is invalid') && message.includes('-3'))).toBe(true);
        expect(messages.every(message => message.startsWith('[discord-player-music]'))).toBe(true);
    })

    it('warns about invalid sources, lyrics, cookies and reactions', () => {
        const { options, messages } = run({ sources: [] as never, lyrics: {} as never, cookies: '', collectorsConfig: { reaction: { reactions: 'x' as never } } });

        expect(options.sources).toBeUndefined();
        expect(options.lyrics).toBeUndefined();
        expect(options.cookies).toBeUndefined();
        expect(options.collectorsConfig.reaction.reactions).toHaveLength(10);
        expect(messages).toHaveLength(4);
    })

    it('does not warn about missing options or valid values', () => {
        expect(run({}).messages).toEqual([]);
        expect(run(undefined).messages).toEqual([]);
        expect(run({ searchResultsLimit: 5, synchronLoop: false, collectorsConfig: { message: { cancel: false, time: '2m' } }, prefetchSeconds: 0 }).messages).toEqual([]);
    })
})

describe('UtilsManager#parseDuration', () => {
    it('parses numbers with units', () => {
        expect(t.player.utils.parseDuration('500')).toBe(500);
        expect(t.player.utils.parseDuration('500ms')).toBe(500);
        expect(t.player.utils.parseDuration('10s')).toBe(10_000);
        expect(t.player.utils.parseDuration('5 secs')).toBe(5_000);
        expect(t.player.utils.parseDuration('1m')).toBe(60_000);
        expect(t.player.utils.parseDuration('1.5 hours')).toBe(5_400_000);
        expect(t.player.utils.parseDuration('2d')).toBe(172_800_000);
        expect(t.player.utils.parseDuration('1 week')).toBe(604_800_000);
        expect(t.player.utils.parseDuration('1y')).toBe(31_557_600_000);
        expect(t.player.utils.parseDuration('-1s')).toBe(-1000);
        expect(t.player.utils.parseDuration('.5s')).toBe(500);
        expect(t.player.utils.parseDuration('30 MINUTES')).toBe(1_800_000);
        expect(t.player.utils.parseDuration('1      s')).toBe(1000);
    })

    it('throws for anything else', () => {
        for(const value of ['', 'abc', '10 parsecs', '1m 30s', ' 10s', '10s ', 'x'.repeat(101), 10 as never, undefined as never, null as never]) expect(() => t.player.utils.parseDuration(value), String(value)).toThrow(/valid duration/);
    })
})

describe('UtilsManager#formatMilliseconds', () => {
    it('formats short', () => {
        expect(t.player.utils.formatMilliseconds(0)).toBe('0ms');
        expect(t.player.utils.formatMilliseconds(999)).toBe('999ms');
        expect(t.player.utils.formatMilliseconds(1000)).toBe('1s');
        expect(t.player.utils.formatMilliseconds(120_000)).toBe('2m');
        expect(t.player.utils.formatMilliseconds(3_600_000)).toBe('1h');
        expect(t.player.utils.formatMilliseconds(172_800_000)).toBe('2d');
        expect(t.player.utils.formatMilliseconds(-60_000)).toBe('-1m');
    })

    it('formats long with the plural only from one and a half units', () => {
        expect(t.player.utils.formatMilliseconds(500, { long: true })).toBe('500 ms');
        expect(t.player.utils.formatMilliseconds(1000, { long: true })).toBe('1 second');
        expect(t.player.utils.formatMilliseconds(1500, { long: true })).toBe('2 seconds');
        expect(t.player.utils.formatMilliseconds(120_000, { long: true })).toBe('2 minutes');
        expect(t.player.utils.formatMilliseconds(3_600_000, { long: true })).toBe('1 hour');
        expect(t.player.utils.formatMilliseconds(172_800_000, { long: true })).toBe('2 days');
    })

    it('throws for values that are not finite numbers', () => {
        for(const value of [NaN, Infinity, '10' as never, undefined as never]) expect(() => t.player.utils.formatMilliseconds(value)).toThrow(/valid number/);
    })

    it('parses what it formats', () => {
        for(const value of [0, 1000, 60_000, 3_600_000, 86_400_000]) expect(t.player.utils.parseDuration(t.player.utils.formatMilliseconds(value))).toBe(value);
    })
})
