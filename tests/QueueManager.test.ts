import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GuildQueueState, Loop } from '../src/PlayerEnums';
import { PlayerError, PlayerErrorCode } from '../src/PlayerError';

import { createFakeProvider, createQueue, createTestPlayer, fakeTrack, sleep, TestPlayer, waitFor } from './helpers';

let t: TestPlayer;

beforeEach(() => { t = createTestPlayer() });
afterEach(async () => { await t.player.queue.stop('G').catch(() => { }); t.cleanup() });

const code = async (promise: Promise<unknown>) => promise.then(() => 'no error', (error: PlayerError) => error.code);

describe('QueueManager playback', () => {
    it('plays tracks one after another and ends the queue', async () => {
        const { queue, connection } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(t.events.filter(event => event.startsWith('playingTrack'))).toEqual(['playingTrack a', 'playingTrack b']);
        expect(connection.destroyed).toBe(true);
        expect(t.player.queue.size).toBe(0);
    })

    it('skips tracks that can not be played and reports them', async () => {
        const { queue } = createQueue(t.player, [fakeTrack('bad1'), fakeTrack('ok'), fakeTrack('bad2')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(t.events.filter(event => event.startsWith('error'))).toHaveLength(2);
        expect(t.events).toContain('playingTrack ok');
    })

    it('rotates the queue when the queue loop is enabled', async () => {
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        queue.loop.queue = true;

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.filter(event => event.startsWith('playingTrack')).length >= 3, 10_000);

        expect(t.events.filter(event => event.startsWith('playingTrack')).slice(0, 3)).toEqual(['playingTrack a', 'playingTrack b', 'playingTrack a']);
        expect(queue.tracks.map(track => track.title)).toHaveLength(2);
    })

    it('repeats the current track when the track loop is enabled', async () => {
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        queue.loop.track = true;

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.filter(event => event === 'playingTrack a').length >= 2, 10_000);

        expect(t.events).not.toContain('playingTrack b');
    })
})

describe('QueueManager events', () => {
    it('tells which provider gives the audio of a track and whether it was prepared in advance', async () => {
        const used: Array<string> = [];

        t.player.on('sourceUsed', data => used.push(`${data.provider}:${data.track.title}:${data.prefetched}`));

        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        // The first track is created on demand, the second one was prepared in advance
        expect(used).toEqual(['fake:a:false', 'fake:b:true']);
    })

    it('tells which provider plays after a seek', async () => {
        const used: Array<{ provider: string, seek?: number }> = [];

        t.player.on('sourceUsed', data => used.push({ provider: data.provider, seek: data.seek }));

        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.seek('G', 1);

        expect(used).toEqual([{ provider: 'fake', seek: undefined }, { provider: 'fake', seek: 1 }]);
    })

    it('tells that a track could not be played and which track is played next', async () => {
        const skipped: Array<string> = [];

        t.player.on('skippedTrack', data => skipped.push(`${data.track.title}->${data.next?.title ?? 'none'}:${data.error.message.includes('boom')}`));

        const { queue } = createQueue(t.player, [fakeTrack('bad1'), fakeTrack('ok'), fakeTrack('bad2')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(skipped).toEqual(['bad1->ok:true', 'bad2->none:true']);
    })
})

describe('QueueManager controls', () => {
    beforeEach(async () => {
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b'), fakeTrack('c'), fakeTrack('d')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
    })

    const titles = async () => (await t.player.queue.get('G')).tracks.map(track => track.title).join(',');

    it('skips the current track', async () => {
        const data = await t.player.queue.skipTrack('G');

        expect(data.current.title).toBe('a');
        expect(data.next?.title).toBe('b');

        await waitFor(() => t.events.includes('playingTrack b'));
        expect(await titles()).toBe('b,c,d');
    })

    it('removes the current track without losing the next one', async () => {
        const data = await t.player.queue.removeTrack('G', 0);

        expect(data.deleted.title).toBe('a');

        await waitFor(() => t.events.includes('playingTrack b'));
        expect(await titles()).toBe('b,c,d');
    })

    it('removes a track from the middle', async () => {
        await t.player.queue.removeTrack('G', 2);

        expect(await titles()).toBe('a,b,d');
        expect(await code(t.player.queue.removeTrack('G', 9))).toBe(PlayerErrorCode.QUEUE_TRACK_NOT_FOUND);
    })

    it('shuffles without moving the current track', async () => {
        const shuffled = await t.player.queue.shuffle('G');

        expect(shuffled[0].title).toBe('a');
        expect(shuffled.map(track => track.title).sort()).toEqual(['a', 'b', 'c', 'd']);
    })

    it('does not shuffle a short queue', async () => {
        await t.player.queue.removeTrack('G', 3);
        await t.player.queue.removeTrack('G', 2);

        expect(await code(t.player.queue.shuffle('G'))).toBe(PlayerErrorCode.SHUFFLE_UNAVAILABLE);
    })

    it('toggles loop modes (only one at a time with synchronLoop)', async () => {
        expect(await t.player.queue.setLoop('G', Loop.QUEUE)).toEqual({ track: false, queue: true });
        expect(await t.player.queue.setLoop('G', Loop.TRACK)).toEqual({ track: true, queue: false });
        expect(await t.player.queue.setLoop('G', Loop.TRACK)).toEqual({ track: false, queue: false });
    })

    it('keeps both loop modes when synchronLoop is disabled', async () => {
        const other = createTestPlayer({ synchronLoop: false });

        createQueue(other.player, [fakeTrack('a')]);

        await other.player.queue.setLoop('G', Loop.QUEUE);

        expect(await other.player.queue.setLoop('G', Loop.TRACK)).toEqual({ track: true, queue: true });

        await other.player.queue.stop('G');
        other.cleanup();
    })

    it('changes and validates the volume', async () => {
        expect(await t.player.queue.setVolume('G', 8)).toEqual({ status: true });
        expect((await t.player.queue.get('G')).volume).toBe(8);

        await t.player.queue.setVolume('G');
        expect((await t.player.queue.get('G')).volume).toBe(t.player.options.defaultVolume);

        expect(await code(t.player.queue.setVolume('G', NaN))).toBe(PlayerErrorCode.INVALID_VALUE);
        expect(await code(t.player.queue.setVolume('G', 'x' as never))).toBe(PlayerErrorCode.INVALID_TYPE);
    })

    it('pauses and resumes', async () => {
        expect(await t.player.queue.setState('G', GuildQueueState.PAUSED)).toEqual({ status: true });
        expect(await code(t.player.queue.setState('G', GuildQueueState.PAUSED))).toBe(PlayerErrorCode.INVALID_STATE);
        expect(await t.player.queue.setState('G')).toEqual({ status: true });
    })

    it('seeks and applies filters from the current position', async () => {
        await sleep(100);

        expect(await t.player.queue.seek('G', 1)).toEqual({ status: true });
        expect((await t.player.queue.setFilter('G', 'bassboost')).name).toBe('bassboost');

        expect(t.provider.log.some(line => line.includes('seek=1 filter=-'))).toBe(true);
        expect(t.provider.log.some(line => line.includes('filter=bass=g=10'))).toBe(true);
        expect(await code(t.player.queue.setFilter('G', 'unknown'))).toBe(PlayerErrorCode.FILTER_NOT_FOUND);
        expect(await code(t.player.queue.seek('G', -1))).toBe(PlayerErrorCode.INVALID_VALUE);
    })

    it('reports the progress and stream info', async () => {
        const progress = await t.player.queue.progress('G');

        expect(progress.percents).toMatch(/%$/);
        expect((await t.player.queue.streamInfo('G')).state).toBe(GuildQueueState.PLAYING);
        expect((await t.player.queue.trackInfo('G', 99)).title).toBe('a');
    })

    it('stops the playback and deletes the queue', async () => {
        expect(await t.player.queue.stop('G')).toEqual({ status: true });
        expect(t.player.queue.size).toBe(0);
        expect(await code(t.player.queue.stop('G'))).toBe(PlayerErrorCode.QUEUE_NOT_FOUND);
    })

    it('requires the guild ID', async () => {
        expect(await code(t.player.queue.get(''))).toBe(PlayerErrorCode.MISSING_PARAMETER);
        expect(await code(t.player.queue.skipTrack('missing'))).toBe(PlayerErrorCode.QUEUE_NOT_FOUND);
    })
})

describe('QueueManager.add', () => {
    it('adds to an existing queue and emits addedTrack', async () => {
        createQueue(t.player, [fakeTrack('a')]);

        expect(await t.player.queue.add(fakeTrack('b'))).toBe(true);
        expect(t.events).toContain('addedTrack b');
    })

    it('closes the queue when the voice connection never becomes ready', async () => {
        const track = fakeTrack('a');

        track.guild = { id: 'NEW', voiceAdapterCreator: () => ({ sendPayload: () => true, destroy: () => { } }) } as never;

        await t.player.queue.add(track);

        expect(t.events).toContain('queueStarted');
        expect(t.player.queue.size).toBe(1);

        await waitFor(() => t.player.queue.size === 0, 10_000);

        expect(t.events.some(event => event.startsWith('error'))).toBe(true);
    })
})

describe('QueueManager events of providers that play the audio of other sources', () => {
    it('tells the provider that gave the audio in the via field of sourceUsed', async () => {
        const wrapper = { ...createFakeProvider(), name: 'wrapper', audioProvider: (url: string) => url.endsWith('=b') ? 'inner-b' : 'inner' };

        t.cleanup();
        t = createTestPlayer({ sources: [wrapper] });

        const used: Array<string> = [];

        t.player.on('sourceUsed', data => used.push(`${data.provider}:${data.track.title}:${data.via}:${data.prefetched}`));

        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => t.events.includes('queueEnded'), 10_000);

        expect(used).toEqual(['wrapper:a:inner:false', 'wrapper:b:inner-b:true']);
    })

    it('has no via for providers that give the audio themselves', async () => {
        const used: Array<string | undefined> = [];

        t.player.on('sourceUsed', data => used.push(data.via));

        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);

        expect(used).toEqual([undefined]);
    })
})

describe('QueueManager queueEnded event (every closed queue)', () => {
    // Collects `reason:number of tracks left` of every queueEnded event
    const watch = () => {
        const ended: Array<string> = [];

        t.player.on('queueEnded', (queue, reason) => ended.push(`${reason}:${queue.tracks.length}`));

        return ended;
    }

    it('tells that the tracks are over (the only case of 1.x)', async () => {
        const ended = watch();
        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await waitFor(() => ended.length > 0, 10_000);

        expect(ended).toEqual(['ended:0']);
        expect(t.events.filter(event => event === 'queueEnded')).toHaveLength(1);
    })

    it('tells that the queue was stopped', async () => {
        const ended = watch();
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.stop('G');

        expect(ended).toEqual(['stopped:2']);
    })

    it('tells that the queue was deleted', async () => {
        const ended = watch();
        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.delete('G');

        expect(ended).toEqual(['deleted:1']);
    })

    it('tells that the last track was skipped, but not when other tracks are left', async () => {
        const ended = watch();
        const { queue } = createQueue(t.player, [fakeTrack('a'), fakeTrack('b')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.skipTrack('G');

        expect(ended).toEqual([]);

        // The skipped track is removed when the audio player becomes idle
        await waitFor(() => queue.tracks.length === 1);
        await t.player.queue.skipTrack('G');

        expect(ended).toEqual(['skipped:1']);
    })

    it('is emitted once for a closed queue, and the queue is already removed then', async () => {
        const sizes: Array<number> = [];

        t.player.on('queueEnded', () => sizes.push(t.player.queue.size));

        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.stop('G');

        // The queue is closed already: nothing more is emitted when the audio player becomes idle
        await sleep(300);

        expect(sizes).toEqual([0]);
        expect(t.events.filter(event => event === 'queueEnded')).toHaveLength(1);
    })

    it('keeps working for a handler of 1.x that takes only the queue', async () => {
        const queues: Array<number> = [];

        t.player.on('queueEnded', queue => queues.push(queue.tracks.length));

        const { queue } = createQueue(t.player, [fakeTrack('a')]);

        await t.player.queue.startTrack('G', queue.tracks[0]);
        await t.player.queue.stop('G');

        expect(queues).toEqual([1]);
    })
})
