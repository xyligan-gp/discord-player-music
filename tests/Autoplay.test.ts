import { afterEach, describe, expect, it } from 'vitest';

import { Loop, Search } from '../src/PlayerEnums';
import { PlayerError, PlayerErrorCode } from '../src/PlayerError';
import { SourceProvider, SourceRelatedOptions, SourceTrack } from '../src/sources/SourceProvider';
import { PlayerTrack } from '../src/types/PlayerData';
import { PlayerOptions } from '../src/types/PlayerOptions';

import { createFakeProvider, createQueue, createTestPlayer, fakeTrack, sleep, TestPlayer, waitFor } from './helpers';

let t: TestPlayer | null = null;

afterEach(async () => {
    await t?.player.queue.stop('G').catch(() => { });
    t?.cleanup();
    t = null;
});

const code = async (promise: Promise<unknown>) => promise.then(() => 'no error', (error: PlayerError) => error.code);

/**
 * Related track of a source provider (plays a tone like every track of the fake provider)
 */
const rel = (id: string, seconds = 60, extra: Partial<SourceTrack> = {}): SourceTrack => ({ id, title: id.toUpperCase(), url: `https://www.youtube.com/watch?v=${id}`, thumbnail: 't', seconds, author: { name: 'Author', url: 'u' }, source: 'fake', ...extra });

type Related = (track: SourceTrack, options: SourceRelatedOptions) => Promise<Array<SourceTrack>>;

/**
 * Fake provider that can find related tracks
 */
const withRelated = (related: Related): SourceProvider => ({ ...createFakeProvider(), related });

/**
 * Creates a player with the autoplay on and a queue with one track `a`, and records what the player tells
 */
function start(sources: Array<SourceProvider>, options: PlayerOptions = {}) {
    t = createTestPlayer({ autoplay: true, sources, ...options });

    const record = { played: [] as Array<string>, added: [] as Array<Array<PlayerTrack>>, reasons: [] as Array<string> };

    t.player.on('playingTrack', track => record.played.push(track.title));
    t.player.on('autoplayAdded', (queue, tracks) => record.added.push(tracks));
    t.player.on('queueEnded', (queue, reason) => record.reasons.push(reason));

    const { queue } = createQueue(t.player, [fakeTrack('a')]);

    return { ...record, queue, begin: () => t?.player.queue.startTrack('G', queue.tracks[0]) as Promise<void> };
}

describe('autoplay', () => {
    it('adds related tracks when the tracks are over and goes on playing them, until it is turned off', async () => {
        const calls: Array<{ title: string, limit: number, exclude?: Array<string> }> = [];
        const a = start([withRelated(async (track, options) => { calls.push({ title: track.title, limit: options.limit, exclude: options.exclude }); return [rel('r1'), rel('r2'), rel('r3'), rel('r4')] })]);

        await a.begin();
        await waitFor(() => a.added.length === 1, 10_000);

        // Three tracks are added at once (autoplayLimit), the track that played is the seed, the tracks are of the same requester
        expect(a.added[0].map(track => track.title)).toEqual(['R1', 'R2', 'R3']);
        expect(a.added[0].every(track => track.searchType === Search.AUTOPLAY && (track.requested as { id: string }).id === 'U')).toBe(true);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({ title: 'a', limit: 12 });
        expect(calls[0].exclude).toContain('https://www.youtube.com/watch?v=a');

        // The queue did not end and addedTrack was not emitted for the related tracks
        expect(a.reasons).toEqual([]);
        expect(t?.events.some(event => event.startsWith('addedTrack'))).toBe(false);

        await t?.player.queue.setAutoplay('G', false);
        await waitFor(() => a.reasons.length > 0, 15_000);

        expect(a.played).toEqual(['a', 'R1', 'R2', 'R3']);
        expect(a.reasons).toEqual(['ended']);
        expect(a.added).toHaveLength(1);
        expect(t?.events.filter(event => event === 'queueEnded')).toHaveLength(1);
    })

    it('goes on again and again: every end finds new tracks and never repeats a played one', async () => {
        const excludes: Array<Array<string>> = [];
        const a = start([withRelated(async (track, options) => { excludes.push(options.exclude ?? []); return [rel('r1'), rel('r2'), rel('r3'), rel('a')] })], { autoplayLimit: 1 });

        await a.begin();
        await waitFor(() => a.played.includes('R3'), 20_000);
        await t?.player.queue.setAutoplay('G', false);
        await waitFor(() => a.reasons.length > 0, 10_000);

        // The provider always offers the same list, the played tracks (and the seed) are removed from it
        expect(a.played).toEqual(['a', 'R1', 'R2', 'R3']);
        expect(excludes.slice(0, 3).map(list => [...new Set(list)].map(url => url.split('=')[1]))).toEqual([['a'], ['a', 'r1'], ['a', 'r1', 'r2']]);
        expect(a.reasons).toEqual(['ended']);
    })

    it('does nothing when the autoplay is off: the queue ends as before', async () => {
        let called = 0;
        const a = start([withRelated(async () => { called++; return [rel('r1')] })], { autoplay: false });

        await a.begin();
        await waitFor(() => a.reasons.length > 0, 10_000);

        expect(a.reasons).toEqual(['ended']);
        expect(a.played).toEqual(['a']);
        expect(called).toBe(0);
    })

    it.each([[Loop.TRACK], [Loop.QUEUE]])('is not used while the loop %s is on', async loop => {
        let called = 0;
        const a = start([withRelated(async () => { called++; return [rel('r1')] })]);

        await a.begin();
        await t?.player.queue.setLoop('G', loop);
        await waitFor(() => a.played.filter(title => title === 'a').length >= 2, 10_000);

        expect(called).toBe(0);
        expect(a.reasons).toEqual([]);
    })

    it('uses the search of the providers when no provider can find related tracks', async () => {
        const queries: Array<string> = [];
        const provider = { ...createFakeProvider(), search: async (query: string) => { queries.push(query); return [rel('a'), rel('s1'), rel('s2')] } };
        const a = start([provider]);

        await a.begin();
        await waitFor(() => a.added.length === 1, 10_000);

        // "<author> <title>" is searched and the seed is not added to itself
        expect(queries).toEqual(['Author a']);
        expect(a.added[0].map(track => track.title)).toEqual(['S1', 'S2']);
    })

    it('skips live streams, long tracks and shorts, and puts tracks of a similar length first', async () => {
        const a = start([withRelated(async () => [rel('live', 0), rel('long', 3600), rel('short', 30, { url: 'https://www.youtube.com/shorts/abc' }), rel('good', 60), rel('near', 2)])], { autoplayLimit: 2, autoplayMaxDuration: '15m' });

        await a.begin();
        await waitFor(() => a.added.length === 1, 10_000);

        // The seed `a` lasts 1 second: 2 seconds is a similar length (between 0.3 and 3 times), 60 seconds is not, so `near` goes first
        expect(a.added[0].map(track => track.title)).toEqual(['NEAR', 'GOOD']);
    })

    it('ends the queue (reason ended) when nothing was found, without an error', async () => {
        // The provider has no related tracks and its search finds nothing
        const a = start([{ ...createFakeProvider(), related: async () => [], search: async () => [] }]);

        await a.begin();
        await waitFor(() => a.reasons.length > 0, 10_000);

        expect(a.reasons).toEqual(['ended']);
        expect(t?.events.some(event => event.startsWith('error'))).toBe(false);
        expect(a.added).toEqual([]);
    })

    it('ends the queue (reason ended) and reports an error when the lookup fails', async () => {
        const failures: Array<string> = [];
        const provider: SourceProvider = { ...createFakeProvider(), related: async () => { throw new Error('related boom') }, search: async () => { throw new Error('search boom') } };
        const a = start([provider]);

        t?.player.on('providerFailed', ({ method }) => failures.push(method));

        await a.begin();
        await waitFor(() => a.reasons.length > 0, 10_000);

        expect(a.reasons).toEqual(['ended']);
        expect(t?.events.filter(event => event.startsWith('error'))).toHaveLength(1);
        expect(t?.events.find(event => event.startsWith('error'))).toContain('search boom');
        expect(failures).toEqual(['related', 'search']);
        expect(t?.events.filter(event => event === 'queueEnded')).toHaveLength(1);
    })

    it('goes on after the last track is skipped', async () => {
        const a = start([withRelated(async () => [rel('r1')])]);

        await a.begin();

        const { next } = await t!.player.queue.skipTrack('G');

        expect(next).toBeNull();

        await waitFor(() => a.added.length === 1, 10_000);

        expect(a.added[0].map(track => track.title)).toEqual(['R1']);
        expect(a.reasons).toEqual([]);
    })

    it('does not add tracks when the queue was stopped while they were searched', async () => {
        let release: (() => void) | undefined;
        const a = start([withRelated(() => new Promise<Array<SourceTrack>>(resolve => { release = () => resolve([rel('r1')]) }))]);

        await a.begin();
        await waitFor(() => release !== undefined, 10_000);
        await t?.player.queue.stop('G');

        release?.();
        await sleep(200);

        // Only the stop closed the queue: the autoplay did not add anything and did not close it a second time
        expect(a.reasons).toEqual(['stopped']);
        expect(a.added).toEqual([]);
    })

    it('stops an endless chain of tracks that can not be played', async () => {
        let rounds = 0;
        const a = start([withRelated(async () => { rounds++; return [rel(`bad${rounds}a`), rel(`bad${rounds}b`)] })], { autoplayLimit: 2 });

        await a.begin();
        await waitFor(() => a.reasons.length > 0, 20_000);

        expect(a.reasons).toEqual(['ended']);
        expect(rounds).toBeLessThanOrEqual(4);
        expect(a.played).toEqual(['a']);
    })
})

describe('queue.setAutoplay', () => {
    it('switches the autoplay of the queue and tells the status', async () => {
        const a = start([withRelated(async () => [])], { autoplay: false });

        expect((await t!.player.queue.get('G')).autoplay).toBe(false);
        expect(await t!.player.queue.setAutoplay('G')).toEqual({ autoplay: true });
        expect(await t!.player.queue.setAutoplay('G')).toEqual({ autoplay: false });
        expect(await t!.player.queue.setAutoplay('G', true)).toEqual({ autoplay: true });
        expect(await t!.player.queue.setAutoplay('G', true)).toEqual({ autoplay: true });
        expect((await t!.player.queue.get('G')).autoplay).toBe(true);
        expect((await t!.player.queue.streamInfo('G')).autoplay).toBe(true);
        expect(a.reasons).toEqual([]);
    })

    it('rejects a wrong status and a missing queue', async () => {
        start([withRelated(async () => [])]);

        expect(await code(t!.player.queue.setAutoplay('G', 'yes' as never))).toBe(PlayerErrorCode.INVALID_TYPE);
        expect(await code(t!.player.queue.setAutoplay('nobody'))).toBe(PlayerErrorCode.QUEUE_NOT_FOUND);
    })

    it('takes the default status of a new queue from the autoplay option', async () => {
        start([withRelated(async () => [])], { autoplay: true });

        expect((await t!.player.queue.get('G')).autoplay).toBe(true);
        expect(t!.player.options.autoplay).toBe(true);
    })
})
