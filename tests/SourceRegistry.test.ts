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
