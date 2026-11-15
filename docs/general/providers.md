# Providers

The module does not have YouTube code inside its core. Tracks come from **source providers** that are tried in order of priority, and lyrics come from a **lyrics provider**. When a provider fails, the next one is used. That is why a change on YouTube's side makes the module a bit slower instead of breaking it.

## Source providers

| Provider | Package | What it does | Notes |
| --- | --- | --- | --- |
| `YoutubeiProvider` (`youtubei`) | [`youtubei.js`](https://github.com/LuanRT/YouTube.js) | Search, video and playlist information, audio streams | Default, first in the list. Light and fast, but YouTube does not give the audio of some videos to it (a PO token is required). |
| `YtDlpProvider` (`yt-dlp`) | [yt-dlp](https://github.com/yt-dlp/yt-dlp) executable | Search, video and playlist information, audio streams | Default, second (fallback). Found in `PATH` or downloaded automatically. |

By default a player uses `[new YoutubeiProvider(), new YtDlpProvider()]`.

### The order and the failure counter

When a provider fails, **every next request for that operation** (for any video) goes to the next provider first for a while, and the failed provider is used only as the last resort. After the cooldown it is tried first again; if it works, the penalty is removed.

```js
const player = new Player(client, {
	// After how many failures in a row (default: 1) and for how long (default: 10 minutes) a provider is used last
	sourceFailureThreshold: 1,
	sourceCooldown: '10m'
});
```

Use `sources` to change the list or the order:

```js
import { Player, YoutubeiProvider, YtDlpProvider } from 'discord-player-music';

// yt-dlp is the main source
new Player(client, { sources: [new YtDlpProvider(), new YoutubeiProvider()] });

// only youtubei, yt-dlp is never used
new Player(client, { sources: [new YoutubeiProvider()] });
```

The registry is available as `player.sources` (`register()`, `unregister()`, `list`, `search()`, `resolve()`, `resolvePlaylist()`, `stream()`).

### yt-dlp

`new YtDlpProvider(options)` looks for yt-dlp in this order:

1. the `command` option (a path or a command; for the Python module use `command: 'python', args: ['-m', 'yt_dlp']`);
2. `yt-dlp` from `PATH` (disable with `lookupPath: false`);
3. the binary that the module downloads from the latest official GitHub release into `~/.cache/discord-player-music`. The file is checked against `SHA2-256SUMS` of the release and an unverified file is never used. Disable this with `autoInstall: false`.

**When it is downloaded and updated.** The player prepares its providers in the background when it is created (`provider.prepare()`), so the download happens at the start of the bot and the first track does not wait for it. The managed binary is also **checked for a newer version at every start** (the installed version is compared with the latest GitHub release and the new one is downloaded when they differ; the check is done at most once per `install.updateInterval`, 1 hour by default, so frequent restarts do not ask GitHub every time; `install.update: false` turns it off). A yt-dlp found in `PATH` is not changed by the module, but the module compares its version with the latest release and tells you when it is old. Every step is reported with the `ytdlpStatus` event of the player, so you can see in the console that it works:

```js
player.on('ytdlpStatus', ({ stage, message, version, latest }) => console.log(`[yt-dlp] ${stage}: ${message}`));
```

| `stage` | Meaning |
| --- | --- |
| `found` | yt-dlp is found (`origin`: `command`, `path` or `managed`, with the `path` and the `version`) |
| `checking` | The version is compared with the latest release |
| `up-to-date` | The installed version is the latest one |
| `update-available` | A newer release exists (`version` is the old one, `latest` is the new one); for a yt-dlp from PATH the module only tells it, for the downloaded one it updates it |
| `downloading`, `installed` | A download started / the binary was installed or updated |
| `skipped` | The check did not run, see `reason`: `update-disabled`, `interval` (it ran recently), `offline` (GitHub can not be reached), `custom-command` (the `command` option is used) |
| `error` | The update failed (the old binary is kept) | If the download or the update fails, the error event is emitted and the older binary keeps working.

```js
new YtDlpProvider({
	autoInstall: true,                       // default
	install: {
		directory: './yt-dlp',               // where the binary is stored
		update: true,                        // check for a newer version when the player starts
		updateInterval: 3_600_000,           // but not more often than this (0: on every start)
		onStatus: event => console.log('[yt-dlp]', event.message)
	},
	cookies: 'cookies.txt',                  // cookies of an account, see the FAQ (a server without a browser)
	extraArgs: ['--proxy', 'http://host:port'], // any yt-dlp arguments
	env: process.env
});
```

### Cookies

When YouTube asks the server to sign in, give the cookies of a signed-in account (see the FAQ for how to export them). **One option serves both sources:**

```js
new Player(client, { cookies: './cookies.txt' });
```

The `YoutubeiProvider` makes a signed-in session with them, and `YtDlpProvider` passes the file to yt-dlp (`--cookies`). For your own list of sources set the option in each provider: `new YoutubeiProvider({ cookies })` and `new YtDlpProvider({ cookies })`.

The downloaded binary solves YouTube challenges with the Node.js that runs the bot (`--js-runtimes node:<path>` is added automatically). When you use your own yt-dlp, make sure it has a JavaScript runtime (see the yt-dlp documentation).

> The module downloads and runs a program from the internet only when `command` is not set, yt-dlp is not installed and `autoInstall` is not `false`. Set `autoInstall: false` on hostings where this is not allowed.

## Extending with modules

Sources that need more than a link parser can be separate packages. A package gives a provider (a class that implements `SourceProvider`) and the player uses it like the built-in ones: `new Player(client, { sources: [..., new MyProvider()] })`, or `player.sources.register(provider)` (then call `provider.prepare()` yourself if it has one).

The core has what such packages need:

* the `SourceProvider` interface with the optional `attach(others)` and `audioProvider(url)` members (see below), and the types `SourceProvider`, `SourceTrack`, `SourcePlaylist` and `SourceStreamOptions`;
* `SourceRegistry`, `PlayerError` and `PlayerErrorCode` to use in a package: the codes `SOURCE_UNAUTHORIZED` (a service did not accept the credentials), `SOURCE_RATE_LIMITED` (too many requests, the message tells the time to wait) and `AUDIO_NOT_FOUND` (the audio of a track was not found in the other sources) are meant for such providers;
* the `via` field of the `sourceUsed` event: the provider that really gave the audio when a provider plays the audio of another one.

A provider that only knows the **information** of a track (for example a service that gives no audio) uses the other providers for the audio: it receives them in `attach(others)` (a function that returns the other providers of the registry, without the provider itself), creates a `SourceRegistry` from them, finds the audio there (`search()`), plays it (`open()`) and returns the name of the provider that gave the audio from `audioProvider(url)`.

```ts
import { Player, SourceRegistry, YoutubeiProvider, YtDlpProvider } from 'discord-player-music';
import type { SourceProvider, SourceStreamOptions, SourceTrack } from 'discord-player-music';

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

new Player(client, { sources: [new YoutubeiProvider(), new YtDlpProvider(), new AudioFromAnotherSource()] });
```

## Autoplay and related tracks

With the `autoplay` option (or `player.queue.setAutoplay(guildID, true)` for one queue) the module does not end the queue when the tracks are over: it looks for tracks related to the track that played last, adds them (`autoplayLimit`, 3 by default) and plays them, again and again, until the autoplay is turned off or the queue is stopped. It does not work while the loop of the track or the queue is on, and it is off by default. `autoAddingTracks` is a different option: it only tells whether `player.search()` adds the found track to the queue.

How the related tracks are found (`SourceRegistry#related`):

1. the providers that have the optional `related()` method and can handle the link are tried in order, with the same failure counter and cooldown as the other operations (`providerFailed` with `related`). `YoutubeiProvider` takes the videos of the "up next" feed of the watch page;
2. when none of them gives tracks (`YtDlpProvider` has no such method), the tracks are searched by the author and the title of the track.

What is skipped: the tracks that already played (the last `autoplayHistory` ones, 50 by default), live streams, shorts and the tracks longer than `autoplayMaxDuration` (`15m`). The tracks of a similar length to the last track go first, because the feed of YouTube is mixed. The added tracks have `searchType` `Search.AUTOPLAY`, the requester and the channels of the track that played before, and the `autoplayAdded` event `(queue, tracks)` tells about them (`addedTrack` is not emitted for them). If nothing suitable is found or the lookup fails, the queue ends as usual (`queueEnded`, reason `ended`; a failed lookup is also reported with the `error` event, method `autoplay`). A chain of tracks that can not be played is stopped after a few rounds.

```js
const player = new Player(client, { autoplay: true });

player.on('autoplayAdded', (queue, tracks) => queue.channel.text.send(`Autoplay: ${tracks.map(track => track.title).join(', ')}`));

// One server: switch the autoplay (it is switched when the status is not passed)
await player.queue.setAutoplay(message.guild.id, false);
```

A provider of yours can find related tracks too:

```ts
async related(track: SourceTrack, options: { limit: number, exclude?: Array<string> }): Promise<Array<SourceTrack>> {
	const found = await myService.similarTo(track.url, options.limit);

	return found.filter(item => !options.exclude?.includes(item.url));
}
```

## Playlists

`YoutubeiProvider` and `YtDlpProvider` can load YouTube playlists (`isPlaylist()` and `resolvePlaylist()`). `player.search()` uses them when you pass a playlist link, see the FAQ.

## Next track preparation

The audio of the next track is created `prefetchSeconds` (20 by default, `0` disables) before the current track ends, so there is no pause between tracks. It works with a loop, skipping, removing and shuffling.

## Writing your own source provider

A provider is an object (or a class) with these members. `isPlaylist` and `resolvePlaylist` are optional.

```ts
import { Readable } from 'node:stream';
import { createOpusStream, Player, SourceProvider, SourceTrack } from 'discord-player-music';

class RadioProvider implements SourceProvider {
	readonly name = 'radio';

	// Which links this provider can resolve and play
	canHandle(url: string): boolean {
		return url.startsWith('https://radio.example.com/');
	}

	// Search by a text query (return an empty array if nothing is found)
	async search(query: string, limit: number): Promise<Array<SourceTrack>> {
		return [];
	}

	// Information about a link
	async resolve(url: string): Promise<SourceTrack> {
		return { id: url, title: 'Radio', url, thumbnail: '', seconds: 0, author: { name: 'Radio', url }, source: this.name };
	}

	// An Ogg Opus stream. `createOpusStream` converts any audio stream with FFmpeg and supports seek and filters.
	async stream(url: string, options?: { seek?: number, filter?: string }): Promise<Readable> {
		const response = await fetch(url);

		return createOpusStream(Readable.fromWeb(response.body as never), options);
	}
}

new Player(client, { sources: [new RadioProvider(), new YoutubeiProvider(), new YtDlpProvider()] });
```

A provider can have an optional `prepare()` method: the player calls it in the background when it is created (a connection, a login, a download). A failure is reported with the `error` event.

The optional `related(track, { limit, exclude })` method finds tracks related to a track (for the [autoplay](#autoplay-and-related-tracks)): it returns at most `limit` tracks without the URLs of `exclude`, and the URL of the track is `track.url`. Two more optional members help providers that play the audio of other sources: `attach(others)` receives a function that returns the other providers of the registry (the registry calls it when the provider is added), and `audioProvider(url)` returns the name of the provider that gave the audio of a track (it is shown in the `via` field of the `sourceUsed` event).

A provider must throw an error when it can not do the job: the registry then moves on to the next provider and emits the `providerFailed` event.

## Lyrics providers

Lyrics come from `LrclibProvider` (the free [LRCLIB](https://lrclib.net) service, no API key). Use the `lyrics` option for another service:

```ts
import { LyricsProvider, Player } from 'discord-player-music';

const geniusLike: LyricsProvider = {
	name: 'my-lyrics',

	// Return null when nothing is found, throw an error when the service is not available
	async search(query) {
		const text = await fetchLyricsSomehow(query);

		return text ? { text, source: 'my-lyrics' } : null;
	}
};

new Player(client, { lyrics: geniusLike });
```
