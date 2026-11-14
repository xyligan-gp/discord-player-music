import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Collector } from '../src/PlayerEnums';
import { PlayerError, PlayerErrorCode } from '../src/PlayerError';
import { PlayerOptions } from '../src/types/PlayerOptions';
import { PlayerTrack } from '../src/types/PlayerData';

import { createTestPlayer, fakeTrack, TestPlayer, waitFor } from './helpers';

/**
 * Collector of discord.js: it only emits `collect` and `end` and can be stopped
 */
class FakeCollector extends EventEmitter {
    public stopped = false;

    stop(reason = 'user') {
        if(this.stopped) return;

        this.stopped = true;

        queueMicrotask(() => this.emit('end', [], reason));
    }
}

/**
 * The message with the list of tracks that the bot sent: it gives collectors and takes reactions
 */
function fakeListMessage() {
    const collector = new FakeCollector();
    const reacted: Array<string> = [];
    const options: Array<Record<string, any>> = [];

    const message = {
        id: 'LIST',
        author: { id: 'BOT' },
        channel: { createMessageCollector: vi.fn((given: Record<string, any>) => { options.push(given); return collector }) },
        createReactionCollector: vi.fn((given: Record<string, any>) => { options.push(given); return collector }),
        react: vi.fn(async (emoji: string) => { reacted.push(emoji) })
    }

    return { message: message as never, collector, reacted, options };
}

const tracks = (count: number): Array<PlayerTrack> => Array.from({ length: count }, (_, index) => ({ ...fakeTrack(`t${index + 1}`), index: index + 1 }));
const text = (content: string, author = 'U') => ({ content, author: { id: author } });
const emoji = (name: string, user = 'U', message = 'LIST') => [{ emoji: { name }, message: { id: message } }, { id: user }] as const;

const code = async (promise: Promise<unknown>) => promise.then(() => 'no error', (error: PlayerError) => error.code);

let t: TestPlayer;

const setup = (options: PlayerOptions = {}) => { t = createTestPlayer({ autoAddingTracks: false, ...options }) };

beforeEach(() => setup());
afterEach(async () => { await t.player.queue.stop('G').catch(() => { }); t.cleanup() });

describe('message collector', () => {
    it('selects the track by its number and does not add it when autoAddingTracks is disabled', async () => {
        const { message, collector } = fakeListMessage();
        const results = tracks(3);
        const promise = t.player.createCollector(Collector.MESSAGE, message, results, 'U');

        collector.emit('collect', text('2'));

        expect(await promise).toEqual({ index: 2, track: results[1], data: results });
        expect(t.player.queue.size).toBe(0);
        expect(collector.stopped).toBe(true);
    })

    it('adds the selected track to the queue when autoAddingTracks is enabled', async () => {
        setup({ autoAddingTracks: true });

        const track = fakeTrack('wanted');

        track.guild = { id: 'G', voiceAdapterCreator: () => ({ sendPayload: () => true, destroy: () => { } }) } as never;

        const { message, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.MESSAGE, message, [track], 'U');

        collector.emit('collect', text(' 1 '));

        expect((await promise).index).toBe(1);
        expect(t.player.queue.size).toBe(1);
        expect(t.events).toContain('queueStarted');
    })

    it('only listens to the user (the author of the list message when no user is given) and uses the configured time', async () => {
        setup({ collectorsConfig: { message: { time: '45s' } } });

        const { message, options } = fakeListMessage();

        void t.player.createCollector(Collector.MESSAGE, message, tracks(2), 'U');
        void t.player.createCollector(Collector.MESSAGE, message, tracks(2));

        const [withUser, withoutUser] = options;

        expect(withUser.time).toBe(45_000);
        expect(withUser.filter(text('1', 'U'))).toBe(true);
        expect(withUser.filter(text('1', 'OTHER'))).toBe(false);
        expect(withoutUser.filter(text('1', 'BOT'))).toBe(true);
        expect(withoutUser.filter(text('1', 'U'))).toBe(false);
    })

    it('rejects a wrong answer when there is one attempt (default): not a number, too small, too large', async () => {
        for(const [answer, expected] of [['abc', PlayerErrorCode.INVALID_VALUE], ['', PlayerErrorCode.INVALID_VALUE], ['1.5', PlayerErrorCode.INVALID_VALUE], ['0', PlayerErrorCode.COLLECTOR_SMALL_VALUE], ['-3', PlayerErrorCode.COLLECTOR_SMALL_VALUE], ['4', PlayerErrorCode.COLLECTOR_LARGE_VALUE]] as const) {
            const { message, collector } = fakeListMessage();
            const promise = t.player.createCollector(Collector.MESSAGE, message, tracks(3), 'U');

            collector.emit('collect', text(answer));

            expect(await code(promise), `answer "${answer}"`).toBe(expected);
        }
    })

    it('lets the user try again while there are attempts, and rejects with the last mistake when they are used up', async () => {
        setup({ collectorsConfig: { message: { attempts: 3 } } });

        const { message, collector } = fakeListMessage();
        const results = tracks(3);
        const promise = t.player.createCollector(Collector.MESSAGE, message, results, 'U');

        collector.emit('collect', text('hello'));
        collector.emit('collect', text('9'));

        expect(collector.stopped).toBe(false);

        collector.emit('collect', text('3'));

        expect((await promise).track).toBe(results[2]);

        // Three mistakes in a row
        const second = fakeListMessage();
        const failed = t.player.createCollector(Collector.MESSAGE, second.message, results, 'U');

        second.collector.emit('collect', text('a'));
        second.collector.emit('collect', text('b'));
        second.collector.emit('collect', text('9'));

        expect(await code(failed)).toBe(PlayerErrorCode.COLLECTOR_LARGE_VALUE);
    })

    it('cancels with the cancel word (any case), which is not an attempt', async () => {
        for(const word of ['cancel', 'CANCEL', ' Cancel ']) {
            setup({ collectorsConfig: { message: { attempts: 2 } } });

            const { message, collector } = fakeListMessage();
            const promise = t.player.createCollector(Collector.MESSAGE, message, tracks(2), 'U');

            collector.emit('collect', text(word));

            expect(await code(promise)).toBe(PlayerErrorCode.COLLECTOR_CANCELLED);
        }
    })

    it('uses another cancel word, or none', async () => {
        setup({ collectorsConfig: { message: { cancel: 'stop' } } });

        const first = fakeListMessage();
        const stopped = t.player.createCollector(Collector.MESSAGE, first.message, tracks(2), 'U');

        first.collector.emit('collect', text('stop'));

        expect(await code(stopped)).toBe(PlayerErrorCode.COLLECTOR_CANCELLED);

        setup({ collectorsConfig: { message: { cancel: false } } });

        const second = fakeListMessage();
        const wrong = t.player.createCollector(Collector.MESSAGE, second.message, tracks(2), 'U');

        second.collector.emit('collect', text('cancel'));

        // Without a cancel word it is just a wrong answer
        expect(await code(wrong)).toBe(PlayerErrorCode.INVALID_VALUE);
    })

    it('rejects when the time is over, and when the list message is deleted', async () => {
        const slow = fakeListMessage();
        const timeout = t.player.createCollector(Collector.MESSAGE, slow.message, tracks(2), 'U');

        slow.collector.emit('end', [], 'time');

        expect(await code(timeout)).toBe(PlayerErrorCode.COLLECTOR_TIMEOUT);

        const deleted = fakeListMessage();
        const gone = t.player.createCollector(Collector.MESSAGE, deleted.message, tracks(2), 'U');

        deleted.collector.emit('end', [], 'messageDelete');

        expect(await code(gone)).toBe(PlayerErrorCode.COLLECTOR_CANCELLED);
    })

    it('ignores everything after the result', async () => {
        const { message, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.MESSAGE, message, tracks(3), 'U');

        collector.emit('collect', text('1'));
        collector.emit('collect', text('3'));
        collector.emit('collect', text('cancel'));
        collector.emit('end', [], 'time');

        expect((await promise).index).toBe(1);
    })
})

describe('reaction collector', () => {
    const numbers = () => t.player.options.collectorsConfig.reaction.reactions;

    it('adds the number reactions for the results and the cancel reaction, in order', async () => {
        const { message, reacted, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.REACTION, message, tracks(3), 'U');

        await waitFor(() => reacted.length === 4);
        collector.emit('end', [], 'time');
        await promise.catch(() => { });

        expect(reacted).toEqual([...numbers().slice(0, 3), '❌']);
    })

    it('does not add the cancel reaction when it is turned off', async () => {
        setup({ collectorsConfig: { reaction: { cancel: false } } });

        const { message, reacted, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.REACTION, message, tracks(2), 'U');

        await waitFor(() => reacted.length === 2);
        collector.emit('end', [], 'time');
        await promise.catch(() => { });

        expect(reacted).toEqual(numbers().slice(0, 2));
    })

    it('selects the track with the reaction, also when Discord adds the variation selector to the emoji', async () => {
        for(const variant of [(value: string) => value, (value: string) => value.replace('⃣', '️⃣')]) {
            const { message, reacted, collector } = fakeListMessage();
            const results = tracks(5);
            const promise = t.player.createCollector(Collector.REACTION, message, results, 'U');

            await waitFor(() => reacted.length === 6);

            const [reaction, user] = emoji(variant(numbers()[3]));

            collector.emit('collect', reaction, user);

            expect(await promise).toEqual({ index: 4, track: results[3], data: results });
        }
    })

    it('only listens to the reactions of the user on the list message', async () => {
        const { message, reacted, options, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.REACTION, message, tracks(2), 'U');

        await waitFor(() => reacted.length === 3);

        const filter = options[0].filter;

        expect(filter(...emoji('1⃣', 'U', 'LIST'))).toBe(true);
        expect(filter(...emoji('1⃣', 'OTHER', 'LIST'))).toBe(false);
        expect(filter(...emoji('1⃣', 'U', 'ANOTHER'))).toBe(false);

        collector.emit('end', [], 'time');
        await promise.catch(() => { });
    })

    it('cancels with the cancel reaction', async () => {
        const { message, reacted, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.REACTION, message, tracks(3), 'U');

        await waitFor(() => reacted.length === 4);

        collector.emit('collect', ...emoji('❌'));

        expect(await code(promise)).toBe(PlayerErrorCode.COLLECTOR_CANCELLED);
    })

    it('treats a wrong emoji (or a number that is not in the list) as an attempt', async () => {
        setup({ collectorsConfig: { reaction: { attempts: 2 } } });

        const { message, reacted, collector } = fakeListMessage();
        const results = tracks(2);
        const promise = t.player.createCollector(Collector.REACTION, message, results, 'U');

        await waitFor(() => reacted.length === 3);

        // A smile and the number 5 (the list has only 2 tracks): the first mistake is forgiven, the user selects the second track
        collector.emit('collect', ...emoji('😀'));
        expect(collector.stopped).toBe(false);

        collector.emit('collect', ...emoji(numbers()[1]));

        expect((await promise).track).toBe(results[1]);

        const second = fakeListMessage();
        const failed = t.player.createCollector(Collector.REACTION, second.message, results, 'U');

        await waitFor(() => second.reacted.length === 3);

        second.collector.emit('collect', ...emoji('😀'));
        second.collector.emit('collect', ...emoji(numbers()[4]));

        expect(await code(failed)).toBe(PlayerErrorCode.INVALID_VALUE);
    })

    it('rejects when the time is over', async () => {
        const { message, reacted, collector } = fakeListMessage();
        const promise = t.player.createCollector(Collector.REACTION, message, tracks(2), 'U');

        await waitFor(() => reacted.length === 3);

        collector.emit('end', [], 'time');

        expect(await code(promise)).toBe(PlayerErrorCode.COLLECTOR_TIMEOUT);
    })

    it('needs the user and no more than 10 results', async () => {
        const { message } = fakeListMessage();

        expect(await code(t.player.createCollector(Collector.REACTION, message, tracks(3)))).toBe(PlayerErrorCode.MISSING_PARAMETER);
        expect(await code(t.player.createCollector(Collector.REACTION, message, tracks(11), 'U'))).toBe(PlayerErrorCode.COLLECTOR_UNKNOWN);
    })

    it('reports a reaction that the bot can not add (no permission)', async () => {
        const { message } = fakeListMessage();

        (message as unknown as { react: ReturnType<typeof vi.fn> }).react.mockRejectedValueOnce(new Error('Missing Permissions'));

        await expect(t.player.createCollector(Collector.REACTION, message, tracks(2), 'U')).rejects.toThrow(/Missing Permissions/);
    })
})

describe('collectors in general', () => {
    it('checks the parameters', async () => {
        const { message } = fakeListMessage();

        expect(await code(t.player.createCollector(Collector.MESSAGE, message, []))).toBe(PlayerErrorCode.COLLECTOR_NO_RESULTS);
        expect(await code(t.player.createCollector(Collector.MESSAGE, undefined as never, tracks(1)))).toBe(PlayerErrorCode.MISSING_PARAMETER);
        expect(await code(t.player.createCollector('nonsense' as never, message, tracks(1)))).toBe(PlayerErrorCode.INVALID_VALUE);
    })

    it('has defaults: 1 attempt, 1 minute for messages, 30 seconds for reactions, cancel word and cancel reaction', () => {
        expect(t.player.options.collectorsConfig.message).toEqual({ time: '1m', attempts: 1, cancel: 'cancel' });
        expect(t.player.options.collectorsConfig.reaction).toMatchObject({ time: '30s', attempts: 1, cancel: '❌' });
        expect(t.player.options.collectorsConfig.reaction.reactions).toHaveLength(10);
    })
})
