import { describe, expect, it } from 'vitest';

import { SourceRegistry } from '../src/sources/SourceRegistry';
import { SourceProvider, SourceTrack } from '../src/sources/SourceProvider';

import { createFakeProvider } from './helpers';

const failing = (name: string, handles = true): SourceProvider => ({
    name,
    canHandle: () => handles,
    search: async () => { throw new Error(`${name} search failed`) },
    resolve: async () => { throw new Error(`${name} resolve failed`) },
    stream: async () => { throw new Error(`${name} stream failed`) }
});

describe('SourceRegistry', () => {
    it('uses the next provider when one fails and reports it', async () => {
        const registry = new SourceRegistry([failing('a'), createFakeProvider()]);
        const failures: Array<string> = [];

        registry.onProviderFailed = (provider, method, error) => { failures.push(`${provider.name}:${method}:${error.message}`) };

        const tracks = await registry.search('query', 2);

        expect(tracks.length).toBeGreaterThan(0);
        expect(tracks[0].source).toBe('fake');
        expect(failures).toEqual(['a:search:a search failed']);
    })

    it('falls back for resolve and stream too', async () => {
        const registry = new SourceRegistry([failing('a'), createFakeProvider()]);

        expect((await registry.resolve('https://youtu.be/x')).title).toBe('Resolved');
        expect(await registry.stream('https://youtu.be/x')).toBeDefined();
    })

    it('throws one error with every reason when all providers fail', async () => {
        const registry = new SourceRegistry([failing('a'), failing('b')]);

        await expect(registry.search('q')).rejects.toThrow(/a: a search failed; b: b search failed/);
    })

    it('only asks the providers that can handle the URL', async () => {
        const registry = new SourceRegistry([failing('skipped', false), createFakeProvider()]);
        const failures: Array<string> = [];

        registry.onProviderFailed = provider => { failures.push(provider.name) };

        await registry.resolve('https://example.com/x');

        expect(failures).toEqual([]);
    })

    it('throws when no provider can handle the URL', async () => {
        const registry = new SourceRegistry([failing('skipped', false)]);

        await expect(registry.stream('https://example.com/x')).rejects.toThrow(/No source provider/);
    })

    it('detects and loads playlists with the providers that support them', async () => {
        const registry = new SourceRegistry([failing('plain'), createFakeProvider()]);

        expect(registry.isPlaylist('https://www.youtube.com/playlist?list=PLabc')).toBe(true);
        expect(registry.isPlaylist('https://www.youtube.com/watch?v=abc')).toBe(false);

        const playlist = await registry.resolvePlaylist('https://www.youtube.com/playlist?list=PLabc', 3);

        expect(playlist.tracks).toHaveLength(3);
        expect(playlist.source).toBe('fake');
        await expect(registry.resolvePlaylist('https://www.youtube.com/watch?v=abc')).rejects.toThrow(/No source provider/);
    })

    it('registers and unregisters providers by name and priority', () => {
        const registry = new SourceRegistry([createFakeProvider()]);

        registry.register(failing('first'), 0);

        expect(registry.list.map(provider => provider.name)).toEqual(['first', 'fake']);
        expect(() => registry.register(failing('first'))).toThrow(/already registered/);
        expect(registry.unregister('first')).toBe(true);
        expect(registry.unregister('first')).toBe(false);
        expect(registry.list).toHaveLength(1);
    })
})

describe('SourceRegistry and providers that use other providers', () => {
    const translator = (log: Array<() => Array<SourceProvider>> = [], name = 'translator'): SourceProvider => ({
        ...createFakeProvider(),
        name,
        attach: others => { log.push(others) }
    });

    it('gives a provider access to the other providers when the registry is created and when the provider is added', () => {
        const log: Array<() => Array<SourceProvider>> = [];
        const registry = new SourceRegistry([failing('a'), translator(log)]);

        expect(log).toHaveLength(1);
        expect(log[0]().map(provider => provider.name)).toEqual(['a']);

        registry.register(failing('late'));

        // The function always returns the current providers, without the provider itself
        expect(log[0]().map(provider => provider.name)).toEqual(['a', 'late']);

        registry.register(translator(log, 'second'), 0);

        expect(log).toHaveLength(2);
        expect(log[1]().map(provider => provider.name)).toEqual(['second', 'a', 'translator', 'late'].slice(1));

        registry.unregister('a');

        expect(log[0]().map(provider => provider.name)).toEqual(['second', 'late']);
    })

    it('does not need attach and audioProvider', async () => {
        const registry = new SourceRegistry([failing('a'), createFakeProvider()]);
        const opened = await registry.open('https://www.youtube.com/watch?v=x');

        expect(opened.provider.audioProvider).toBeUndefined();
    })
})

describe('SourceRegistry#related', () => {
    const track = (id: string): SourceTrack => ({ id, title: id.toUpperCase(), url: `https://www.youtube.com/watch?v=${id}`, thumbnail: 't', seconds: 100, author: { name: 'Author', url: 'u' }, source: 'x' });
    const seed = track('seed');

    // Provider that finds related tracks (it can handle the link only when `handles` is true)
    const finder = (name: string, related: SourceProvider['related'], handles = true): SourceProvider => ({ ...createFakeProvider(), name, canHandle: () => handles, related });

    it('asks the providers that can find related tracks in order and moves on when one fails', async () => {
        const calls: Array<string> = [];
        const failures: Array<string> = [];
        const registry = new SourceRegistry([
            { ...createFakeProvider(), name: 'plain', canHandle: () => true },
            finder('broken', async () => { calls.push('broken'); throw new Error('boom') }),
            finder('works', async (item, options) => { calls.push(`works ${item.url.split('=')[1]} limit=${options.limit}`); return [track('r1'), track('r2')] })
        ]);

        registry.onProviderFailed = (provider, method) => { failures.push(`${provider.name}:${method}`) };

        const found = await registry.related(seed, { limit: 5 });

        expect(found.map(item => item.id)).toEqual(['r1', 'r2']);
        expect(calls).toEqual(['broken', 'works seed limit=5']);
        expect(failures).toEqual(['broken:related']);
    })

    it('removes the track itself, the excluded URLs and duplicates', async () => {
        const registry = new SourceRegistry([finder('one', async () => [track('seed'), track('old'), track('r1'), track('r1'), track('r2')])]);
        const found = await registry.related(seed, { limit: 5, exclude: ['https://www.youtube.com/watch?v=old'] });

        expect(found.map(item => item.id)).toEqual(['r1', 'r2']);
    })

    it('puts a provider that keeps failing last, like the other operations', async () => {
        const calls: Array<string> = [];
        const registry = new SourceRegistry([
            finder('flaky', async () => { calls.push('flaky'); throw new Error('boom') }),
            finder('steady', async () => { calls.push('steady'); return [track('r1')] })
        ]);

        await registry.related(seed, { limit: 3 });
        await registry.related(seed, { limit: 3 });

        expect(calls).toEqual(['flaky', 'steady', 'steady']);
    })

    it('searches by the author and the title when no provider finds related tracks', async () => {
        const queries: Array<string> = [];
        const search = async (query: string, limit: number) => { queries.push(`${query} (${limit})`); return [track('seed'), track('s1')] };

        // A provider that can not handle the link, and one that has nothing
        const registry = new SourceRegistry([
            { ...finder('other site', async () => [track('never')], false), search },
            finder('empty', async () => [])
        ]);

        const found = await registry.related(seed, { limit: 2 });

        expect(found.map(item => item.id)).toEqual(['s1']);
        expect(queries).toEqual(['Author SEED (5)']);
    })

    it('throws when the search fails too', async () => {
        const registry = new SourceRegistry([{ ...finder('bad', async () => { throw new Error('no related') }), search: async () => { throw new Error('no search') } }]);

        await expect(registry.related(seed, { limit: 2 })).rejects.toThrow(/no search/);
    })
})
