import { afterEach, describe, expect, it } from 'vitest';

import { GuildQueueState } from '../src/PlayerEnums';
import { PlayerOptions } from '../src/types/PlayerOptions';
import { PlayerQueue, TrackProgressData } from '../src/types/PlayerData';

import { createQueue, createTestPlayer, fakeTrack, sleep, TestPlayer, waitFor } from './helpers';

let t: TestPlayer | null = null;

afterEach(async () => {
    await t?.player.queue.stop('G').catch(() => { });
    t?.cleanup();
    t = null;
});

/**
 * Creates a player and a queue with a track that lasts one second, and records the `trackProgress` events
 */
function start(options: PlayerOptions = {}, titles: Array<string> = ['a']) {
    t = createTestPlayer({ progressInterval: 0.2, ...options });

    const events: Array<{ queue: PlayerQueue, data: TrackProgressData }> = [];

    t.player.on('trackProgress', (queue, data) => events.push({ queue, data }));

    const { queue } = createQueue(t.player, titles.map(title => fakeTrack(title)));

    return { events, queue, begin: () => t?.player.queue.startTrack('G', queue.tracks[0]) as Promise<void> };
}

describe('trackProgress', () => {
    it('is off by default: no events and no timer', async () => {
        const a = start({ progressInterval: undefined });

        await a.begin();
        await sleep(700);

        expect(a.events).toEqual([]);
        expect(a.queue.progressTimer).toBeUndefined();
        expect(t?.player.options.progressInterval).toBe(0);
    })

    it('is emitted every interval while a track plays, with the position, the duration and the progress bar', async () => {
        const a = start();

        await a.begin();
        await waitFor(() => a.events.length >= 3, 5_000);

        const { queue, data } = a.events[a.events.length - 1];

        expect(queue).toBe(a.queue);
        expect(data.track.title).toBe('a');
        expect(data.duration).toBe(1);
        expect(Number.isInteger(data.position)).toBe(true);
        expect(data.percents).toMatch(/^\d+%$/);
        expect(typeof data.bar).toBe('string');
        expect(data.bar.length).toBeGreaterThan(0);

        // The progress goes forward
        const percents = a.events.map(item => Number(item.data.percents.replace('%', '')));

        expect(percents[percents.length - 1]).toBeGreaterThanOrEqual(percents[0]);
    })

    it('does not emit while the queue is paused and goes on after it is resumed', async () => {
        const a = start();

        await a.begin();
        await waitFor(() => a.events.length >= 1, 5_000);
        await t?.player.queue.setState('G', GuildQueueState.PAUSED);

        const paused = a.events.length;

        expect(a.queue.progressTimer).toBeUndefined();

        await sleep(700);

        expect(a.events.length).toBe(paused);

        await t?.player.queue.setState('G', GuildQueueState.PLAYING);
        await waitFor(() => a.events.length > paused, 5_000);
    })

    it('shows the new position after a seek', async () => {
        const a = start();

        await a.begin();
        await waitFor(() => a.events.length >= 1, 5_000);

        const before = a.events.length;

        await t?.player.queue.seek('G', 0.6);
        await waitFor(() => a.events.length > before, 5_000);

        // 0.6 of 1 second is played from the start of the stream that was created again
        expect(Number(a.events[a.events.length - 1].data.percents.replace('%', ''))).toBeGreaterThanOrEqual(60);
    })

    it('does not keep the process alive (the timer is unref)', async () => {
        const a = start();

        await a.begin();
        await waitFor(() => a.events.length >= 1, 5_000);

        expect(a.queue.progressTimer?.hasRef()).toBe(false);
    })

    it.each([
        ['stop', async (player: TestPlayer['player']) => { await player.queue.stop('G') }],
        ['delete', async (player: TestPlayer['player']) => { await player.queue.delete('G') }],
        ['skip of the last track', async (player: TestPlayer['player']) => { await player.queue.skipTrack('G') }]
    ])('stops after the queue is closed by %s', async (_name, close) => {
        const a = start();

        await a.begin();
        await waitFor(() => a.events.length >= 1, 5_000);
        await close(t!.player);

        expect(a.queue.progressTimer).toBeUndefined();

        const count = a.events.length;

        await sleep(600);

        expect(a.events.length).toBe(count);
    })

    it('stops when the tracks are over', async () => {
        const a = start();

        await a.begin();
        await waitFor(() => t?.events.includes('queueEnded') ?? false, 10_000);

        expect(a.queue.progressTimer).toBeUndefined();

        const count = a.events.length;

        await sleep(600);

        expect(a.events.length).toBe(count);
    })

    it('starts again for the next track', async () => {
        const a = start({}, ['a', 'b']);

        await a.begin();
        await waitFor(() => a.events.some(item => item.data.track.title === 'b'), 10_000);

        expect(a.events.some(item => item.data.track.title === 'a')).toBe(true);
    })

    it('goes on when a listener throws: the error is reported and the playback is not stopped', async () => {
        const a = start();

        t?.player.on('trackProgress', () => { throw new Error('listener boom') });

        await a.begin();
        await waitFor(() => (t?.events.filter(event => event === 'error listener boom').length ?? 0) >= 2, 5_000);

        // The timer still works (more than one event), and the track was not skipped because of the error
        expect(a.events.length).toBeGreaterThanOrEqual(2);
        expect(t?.events).not.toContain('queueEnded');
        expect(t?.events).toContain('playingTrack a');
    })
})

describe('progressInterval option', () => {
    const run = (options: Parameters<TestPlayer['player']['utils']['checkOptions']>[0]) => {
        t = createTestPlayer();

        const messages: Array<string> = [];
        const original = console.warn;

        console.warn = (...args: Array<unknown>) => { messages.push(args.join(' ')) };

        try {
            return { options: t.player.utils.checkOptions(options), messages };
        }finally {
            console.warn = original;
        }
    }

    it('is 0 by default and takes 0 and numbers from 0.1', () => {
        expect(run({}).options.progressInterval).toBe(0);
        expect(run({ progressInterval: 0 })).toMatchObject({ options: { progressInterval: 0 }, messages: [] });
        expect(run({ progressInterval: 0.1 })).toMatchObject({ options: { progressInterval: 0.1 }, messages: [] });
        expect(run({ progressInterval: 10 })).toMatchObject({ options: { progressInterval: 10 }, messages: [] });
    })

    it('warns about invalid values and uses 0', () => {
        for(const value of [-1, 0.05, Infinity, NaN, '5' as never]) {
            const { options, messages } = run({ progressInterval: value });

            expect(options.progressInterval, String(value)).toBe(0);
            expect(messages, String(value)).toHaveLength(1);
            expect(messages[0]).toContain('Option "progressInterval" is invalid');
        }
    })
})
