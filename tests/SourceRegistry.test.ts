import { describe, expect, it } from 'vitest';

import { SourceRegistry } from '../src/sources/SourceRegistry';
import { SourceProvider } from '../src/sources/SourceProvider';

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
