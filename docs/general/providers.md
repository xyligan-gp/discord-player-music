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
