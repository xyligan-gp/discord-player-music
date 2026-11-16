/* eslint-disable @typescript-eslint/no-unused-vars -- the class is the example from the docs, its stub methods have unused parameters */
import { Client } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { Player, SourceRegistry } from '../index';
import type { SourceProvider, SourceStreamOptions, SourceTrack } from '../index';

import { createFakeProvider } from './helpers';

// The class below is the example of docs/general/providers.md ("Extending with modules"): keep them the same, so the example does not get old
class AudioFromAnotherSource implements SourceProvider {
	readonly name = 'audio-from-another-source';

	private others: () => Array<SourceProvider> = () => [];
	private audio: SourceRegistry | null = null;
	private used = new Map<string, string>();

	// The registry calls it when the provider is added: `others()` returns the other providers (without this one)
	attach(others: () => Array<SourceProvider>): void {
		this.others = others;
	}

	canHandle(url: string): boolean { return url.startsWith('https://info.example.com/track/'); }
	async search(query: string, limit: number): Promise<Array<SourceTrack>> { return []; /* ask your service */ }
	async resolve(url: string): Promise<SourceTrack> { throw new Error('ask your service'); }

	async stream(url: string, options?: SourceStreamOptions) {
		this.audio ??= new SourceRegistry(this.others());                                 // the other providers give the audio

		const info = await this.resolve(url);
		const [found] = await this.audio.search(`${info.author.name} ${info.title}`, 1);  // find the same track there
		if(!found) throw new Error(`No audio for ${info.title}`);                         // the player skips the track and emits `skippedTrack`

		const opened = await this.audio.open(found.url, options);                         // the stream and the provider that gave it

		this.used.set(url, opened.provider.name);

		return opened.stream;
	}

	// Shown in the `via` field of the `sourceUsed` event
	audioProvider(url: string): string | undefined { return this.used.get(url); }
}

class Tested extends AudioFromAnotherSource {
	async resolve(url: string): Promise<SourceTrack> {
		return { id: 'i', title: 'Song', url, thumbnail: 't', seconds: 100, author: { name: 'Artist', url: 'u' }, source: this.name };
	}
}

describe('Example of a provider that plays the audio of other providers', () => {
	const url = 'https://info.example.com/track/1';

	it('gets the other providers, finds the audio there and tells which provider gave it', async () => {
		const log: Array<string> = [];
		const registry = new SourceRegistry([new Tested(), createFakeProvider(log)]);
		const opened = await registry.open(url, { seek: 3 });

		expect(opened.provider.name).toBe('audio-from-another-source');
		expect(opened.provider.audioProvider?.(url)).toBe('fake');
		expect(log).toEqual(['stream watch?v=id1 seek=3 filter=-']);
	})

	it('fails when the audio is not found, so the player can skip the track', async () => {
		const empty = { ...createFakeProvider(), name: 'empty', canHandle: () => false, search: async () => [] };

		await expect(new SourceRegistry([new Tested(), empty]).open(url)).rejects.toThrow(/No audio for Song/);
	})

	it('is used by a player like the built-in providers', async () => {
		const player = new Player(new Client({ intents: [] }), { sources: [new Tested(), createFakeProvider()] });

		player.on('error', () => { });

		const opened = await player.sources.open(url);

		expect(opened.provider.audioProvider?.(url)).toBe('fake');
	})
})
