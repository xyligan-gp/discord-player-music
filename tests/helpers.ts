import { createReadStream } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'discord.js';
import { AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior } from '@discordjs/voice';

import { Player } from '../src/Player';
import { GuildQueueState } from '../src/PlayerEnums';
import { PlayerOptions } from '../src/types/PlayerOptions';
import { PlayerQueue, PlayerTrack } from '../src/types/PlayerData';
import { SourceProvider } from '../src/sources/SourceProvider';

export const TONE = new URL('./fixtures/tone.ogg', import.meta.url);

/**
 * Provider that plays a 1 second tone. URLs that contain `bad` fail. Every call is stored in `log`.
 */
export function createFakeProvider(log: Array<string> = []): SourceProvider & { log: Array<string> } {
    return {
        name: 'fake',
        log,
        canHandle: () => true,
        search: async query => [1, 2, 3].map(i => ({ id: `id${i}`, title: `${query} ${i}`, url: `https://www.youtube.com/watch?v=id${i}`, thumbnail: 't', seconds: 60 * i, author: { name: 'Author', url: 'u' }, source: 'fake' })),
        isPlaylist: url => url.includes('list=PL'),
        resolvePlaylist: async (url, limit) => ({ id: 'PLfake', title: 'Fake playlist', url, source: 'fake', tracks: ['p1', 'p2', 'bad3', 'p4', 'p5'].slice(0, limit).map(id => ({ id, title: `Playlist ${id}`, url: `https://www.youtube.com/watch?v=${id}`, thumbnail: 't', seconds: 1, author: { name: 'Author', url: 'u' }, source: 'fake' })) }),
        resolve: async url => ({ id: 'id', title: 'Resolved', url, thumbnail: 't', seconds: 125, author: { name: 'Author', url: 'u' }, source: 'fake' }),
        stream: async (url, options) => {
            log.push(`stream ${url.split('/').pop()} seek=${options?.seek ?? '-'} filter=${options?.filter ?? '-'}`);

            if(url.includes('bad')) throw new Error('boom');

            return createReadStream(TONE);
        }
    }
}

export interface TestPlayer {
    player: Player;
    provider: ReturnType<typeof createFakeProvider>;
    dir: string;
    events: Array<string>;
    cleanup(): void;
}

/**
 * Creates a player with a fake provider. It is never logged in to Discord.
 */
export function createTestPlayer(options: PlayerOptions = {}): TestPlayer {
    const dir = mkdtempSync(join(tmpdir(), 'dpm-test-'));
    const provider = createFakeProvider();
    const player = new Player(new Client({ intents: [] }), { sources: [provider], ...options });
    const events: Array<string> = [];

    for(const event of ['playingTrack', 'queueEnded', 'queueStarted', 'addedTrack'] as const) player.on(event, (data: unknown) => events.push(`${event} ${(data as { title?: string })?.title ?? ''}`.trim()));
    player.on('error', data => events.push(`error ${data.error.message}`));

    return { player, provider, dir, events, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export function fakeTrack(title: string): PlayerTrack {
    return {
        searchType: 'search#url',
        title,
        url: `https://www.youtube.com/watch?v=${title}`,
        thumbnail: 't',
        author: { name: 'Author', url: 'u' },
        channel: { text: { id: 'T' } as never, voice: { id: 'V' } as never },
        guild: { id: 'G' } as never,
        requested: { id: 'U' } as never,
        duration: { hours: '00', minutes: '00', seconds: '01' }
    }
}

/**
 * Registers a queue that is ready to play: the voice connection is a stub, the audio player plays without subscribers
 */
export function createQueue(player: Player, tracks: Array<PlayerTrack>): { queue: PlayerQueue, connection: { state: { status: string }, destroyed: boolean } } {
    const connection = { state: { status: 'ready' }, destroyed: false, subscribe() { }, destroy() { this.state.status = 'destroyed'; this.destroyed = true } };
    const manager = player.queue as unknown as { storage: Map<string, PlayerQueue>, handleIdle(id: string): void, handlePlayerError(id: string, error: Error): void };

    const queue: PlayerQueue = {
        channel: { text: {} as never, voice: { id: 'V' } as never },
        dispatcher: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } }),
        tracks,
        connection: connection as never,
        loop: { track: false, queue: false },
        volume: player.options.defaultVolume,
        startStream: Date.now(),
        state: GuildQueueState.PLAYING,
        filter: { name: null, value: null }
    }

    queue.dispatcher.on(AudioPlayerStatus.Idle, () => manager.handleIdle('G'));
    queue.dispatcher.on('error', error => manager.handlePlayerError('G', error));
    manager.storage.set('G', queue);

    return { queue, connection }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Waits until the condition is true
 */
export async function waitFor(condition: () => boolean, timeout = 8000): Promise<void> {
    const start = Date.now();

    while(!condition()) {
        if(Date.now() - start > timeout) throw new Error('waitFor timed out');

        await sleep(20);
    }
}
