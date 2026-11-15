# Updating page

This documentation page is a short list of changes to your code that will have to be done when switching to a specific version of discord-player-music!

## 1.1.5
In version 1.1.5, `discord-player-music` was completely rewritten for the manager system.

### Player Constructor

```diff
+ options.searchResultsLimit
+ options.synchronLoop
+ options.defaultVolume

+ options.collectorsConfig.autoAddingSongs
+ options.collectorsConfig.maxAttempts
+ options.collectorsConfig.time
```

### Player Methods Update
#### CollectorsManager

```diff
+ player.collectors.message
```

#### VoiceManager

```diff
- player.joinVoiceChannel
+ player.voice.join

- player.leaveVoiceChannel
+ player.voice.leave
```

#### UtilsManager

```diff
- player.createStream
+ player.utils.checkNode
+ player.utils.checkOptions
+ player.utils.checkPermissions
+ player.utils.createCollector
```

#### Main Player

```diff
- player.getSongIndex

- player.skipSong
+ player.skip

- player.stopPlaying
+ player.stop

- player.pausePlaying
+ player.pause

- player.resumePlaying
+ player.resume

- player.getCurrentSongInfo
+ player.getSongInfo

- player.initPlayer
+ player.init
```

## 1.1.7
In version 1.1.7, `discord-player-music` was completely rewritten on TypeScript language.

### Module Constructor

```diff
- options.collectorsConfig.autoAddingSongs
- options.collectorsConfig.maxAttempts
- options.collectorsConfig.time
+ options.autoAddingTracks

+ options.databaseConfig
+ options.databaseConfig.path
+ options.databaseConfig.checkInterval

+ options.progressConfig
+ options.progressConfig.size
+ options.progressConfig.line
+ options.progressConfig.slider

+ options.collectorsConfig.message
+ options.collectorsConfig.message.time
+ options.collectorsConfig.message.attempts

+ options.collectorsConfig.reaction
+ options.collectorsConfig.reaction.time
+ options.collectorsConfig.reaction.attempts
+ options.collectorsConfig.reaction.reactions
```

### Player Events Update

```diff
+ player#ready
+ player#queueStarted
+ player#createdPlaylist
+ player#deletedPlaylist
+ player#queueStateChange

- player#playerError
+ player#error

- player#songsAdded
+ player#addedTrack

- player#playingSong
+ player#playingTrack
```

### Player Methods Update

#### Main Player Class

```diff
- player.collectors.message
+ player.createCollector

- player.play
+ player.initGuildTrack

- player.searchSong
+ player.search

- player.addSong
+ player.initQueueTrack

- player.pause
- player.resume
+ player.queue.setState

- player.setLoopSong
- player.setLoopQeue
+ player.queue.setLoop

- player.skip
+ player.queue.skipTrack

- player.setFilter
+ player.queue.setFilter

- player.shuffle
+ player.queue.shuffle

- player.getGuildMap
- player.getQueue
+ player.queue.get

- player.getSongInfo
+ player.queue.trackInfo
+ player.queue.streamInfo

- player.getLyrics
+ player.lyrics

- player.getFilters
+ player.filters.list

- player.createProgressBar
+ player.queue.progress

- player.setVolume
+ player.queue.setVolume

- player.stop
+ player.queue.stop

- player.removeSong
+ player.queue.removeTrack
```

#### DatabaseManager

```diff
+ player.database.get
+ player.database.write
+ player.database.initGuild
+ private player.database.init
```

#### FiltersManager

```diff
+ player.filters.add
+ player.filters.isExists
+ player.filters.get
+ player.filters.list
+ player.filters.delete
+ private player.filters.init
```

#### PlaylistsManager

```diff
+ player.playlists.create
+ player.playlists.addTrack
+ player.playlists.play
+ player.playlists.removeTrack
+ player.playlists.delete
```

#### QueueManager

```diff
+ player.queue.add
+ player.queue.get
+ player.queue.progress
+ player.queue.streamInfo
+ player.queue.trackInfo
+ player.queue.setFilter
+ player.queue.setLoop
+ player.queue.setState
+ player.queue.setVolume
+ player.queue.skipTrack
+ player.queue.removeTrack
+ player.queue.seek
+ player.queue.shuffle
+ player.queue.stop
+ player.queue.delete
```

#### UtilsManager

```diff
- player.utils.checkNode
- player.utils.checkPermissions
- player.utils.getPlayerMode
+ player.utils.formatDuration
+ player.utils.createEmptyProgress
+ player.utils.getUniqueID
+ player.utils.getTrackDuration
```

## 2.0.0
Version 2.0.0 fixes the playback of YouTube tracks: the old `ytdl-core` and `yt-search` libraries stopped working, so the source layer was rewritten. **All method and event names of 1.1.7 are kept**, but errors work in a different way and some requirements changed.

### Requirements

```diff
- Node.js 16.9.0
+ Node.js 22.12.0
- discord.js 14 (any)
+ discord.js 14.28

- @discordjs/voice 0.11
+ @discordjs/voice 0.19 (installed with the module)

- ytdl-core, yt-search
+ youtubei.js, yt-dlp (downloaded automatically)

- @discordjs/opus (required)
+ opusscript (installed with the module, @discordjs/opus is optional)
```

### Errors are thrown, not returned (breaking)

In 1.x many methods returned `{ error: { code, message } }`. Now every method **rejects with a `PlayerError`**. It has `code` (`PlayerErrorCode`), `status` (a number like HTTP: `404`, `400`, `409`, `502`...), `message` and `cause` (the original error, for example of a source provider).

```diff
- const skipData = await player.queue.skipTrack(guildID);
- if(skipData?.error) return message.channel.send({ content: skipData.error.message });
-
- message.channel.send({ content: `Skipped: ${skipData.current.title}` });
+ try {
+     const skipData = await player.queue.skipTrack(guildID);
+
+     message.channel.send({ content: `Skipped: ${skipData.current.title}` });
+ }catch(error) {
+     if(error instanceof PlayerError) return message.channel.send({ content: error.message });
+
+     throw error;
+ }
```

Error codes (`PlayerErrorCode`):

| Code | When |
| --- | --- |
| `MISSING_PARAMETER`, `INVALID_TYPE`, `INVALID_VALUE` | A parameter is missing or invalid (this was a thrown `PlayerError` in 1.x too) |
| `QUEUE_NOT_FOUND`, `QUEUE_TRACK_NOT_FOUND` | The server has no queue, or the queue has no track with that index |
| `SHUFFLE_UNAVAILABLE` | The queue has less than 3 tracks (the playing track is not shuffled) |
| `INVALID_STATE` | The queue is already in the requested state (paused or playing) |
| `FILTER_NOT_FOUND`, `FILTER_EXISTS` | Filters |
| `USER_NOT_IN_VOICE`, `ALREADY_CONNECTED`, `CONNECTION_FAILED`, `GUILD_NOT_FOUND` | Voice channels and servers |
| `TRACK_NOT_FOUND`, `LYRICS_NOT_FOUND` | Search and lyrics (`cause` has the reason, for example a source provider error) |
| `SIGN_IN_REQUIRED` | YouTube asks to sign in to play the video (age-restricted, or the server was taken for a bot): the cookies of an account are needed, see the FAQ |
| `COLLECTOR_NO_RESULTS`, `COLLECTOR_UNKNOWN`, `COLLECTOR_SMALL_VALUE`, `COLLECTOR_LARGE_VALUE`, `COLLECTOR_TIMEOUT`, `COLLECTOR_CANCELLED` | Collectors (`createCollector()` now rejects with `COLLECTOR_TIMEOUT` when nothing is selected in time, in 1.x it never finished; `COLLECTOR_CANCELLED` when the user cancels; the attempts used up by wrong answers end with `INVALID_VALUE`, `COLLECTOR_SMALL_VALUE` or `COLLECTOR_LARGE_VALUE`) |
| `SOURCES_FAILED` | Every source provider failed |
| `SOURCE_RATE_LIMITED`, `SOURCE_UNAUTHORIZED`, `AUDIO_NOT_FOUND` | A service limits the requests / did not accept the credentials / the audio of a track was not found in the other sources |

The type `ErrorData` and the `PlayerError` typedef with `{ channel, requested, method, error }` (it described the `error` event) were renamed to `PlayerErrorEvent`. The messages are the same as before (`player.errors` still exists).

The `error` event is emitted for errors that happen in the background (a track that can not be played, a lost voice connection) and now has the same data as before: `{ channel, requested, method, error }`. An `error` event without listeners is printed to the console and no longer crashes the process.

### Tracks that can not be played

A track that can not be played is reported with the `error` event and **skipped**, the queue continues with the next track (in 1.x the queue could hang). If the voice connection is lost, the queue is closed.

### New and changed events

```diff
+ player#providerFailed
+ player#sourceUsed
+ player#ytdlpStatus
+ player#skippedTrack
```

**`queueEnded` changed:** it now has a second argument `reason` and is emitted once every time a queue is closed, not only when the tracks are over: `reason` is `ended` (the tracks are over, the only case in 1.x), `stopped` (`queue.stop()`), `deleted` (`queue.delete()`), `skipped` (the last track was skipped) or `error` (the voice connection failed). Handlers of 1.x `(queue) => ...` keep working, but they now also run in the new cases: use `if(reason === 'ended')` to keep the old behaviour.

`sourceUsed` also has `via` (the provider that gave the audio, when a provider plays the audio of another one).

`providerFailed` has `{ provider, method, error }` and is emitted when a source provider fails and the next one is used. `sourceUsed` has `{ provider, track, seek, prefetched }` and tells which provider gives the audio of a track (a debugging event). `ytdlpStatus` has `{ stage, message, origin, path, version, latest, reason }` and reports every step of finding, checking, downloading and updating yt-dlp (`stage` is `found`, `checking`, `up-to-date`, `update-available`, `downloading`, `installed`, `skipped` (see `reason`: `update-disabled`, `interval`, `offline`, `custom-command`) or `error`). `skippedTrack` has `{ track, next, error }` and is emitted when a track could not be played and the queue goes on with the next one. Every `Player` now has its own event emitter (in 1.x all players shared one).

### New and changed options

See the [Providers page](providers.md) for the source providers, the order of the sources and writing your own provider.

```diff
+ options.sources            // source providers, [YoutubeiProvider, YtDlpProvider] by default
+ options.lyrics             // lyrics provider, LrclibProvider by default
+ options.playlistLimit      // tracks taken from a playlist link, 100
+ options.prefetchSeconds    // the next track is prepared in advance, 20
+ options.sourceFailureThreshold, options.sourceCooldown

+ options.collectorsConfig.message.cancel, options.collectorsConfig.reaction.cancel // the cancel word (`cancel`) and the cancel reaction (`❌`), `false` turns them off
* options.collectorsConfig.*.attempts // every message or reaction of the user is an attempt, the user can try again while there are attempts
* options.synchronLoop       // `false` is not replaced with `true` any more
* invalid options          // an option that is passed but is wrong (for example `time: 60000` instead of `'1m'`) is still replaced with the default value, but the module tells about it with `console.warn`
- options.databaseConfig                // removed together with the server playlists, see "Removed" below
```

### Methods

Names are the same as in 1.1.7. What changed:

```diff
* player.search(query, member, channel)       // a playlist link adds all its tracks and starts playing, returns an array of tracks; throws TRACK_NOT_FOUND
* player.lyrics(query)                        // LRCLIB; returns { query, result, title, artist, source }; throws LYRICS_NOT_FOUND
* player.createCollector(...)                 // rejects with COLLECTOR_TIMEOUT or COLLECTOR_CANCELLED, the reaction collector adds a cancel reaction
* player.queue.setFilter(guildID, filter)     // continues from the current position
* player.queue.removeTrack(guildID, 0)        // removing the playing track skips it
* player.queue.setVolume(guildID)             // without a value sets the default volume
* player.queue.seek(guildID, seconds)         // validates the value
+ player.sources                              // SourceRegistry
+ player.utils.parseDuration(text)             // '10m' -> milliseconds
+ player.utils.formatMilliseconds(ms, { long }) // milliseconds -> '2m' or '2 minutes'
+ player.lyricsProvider
```

New enum value: `Search.PLAYLIST`.

### Types and imports

Types are generated from the code and exported from the main package. The `discord-player-music/types/...` files do not exist any more.

```diff
- import { PlayerTrack } from 'discord-player-music/types/PlayerData';
+ import type { PlayerTrack } from 'discord-player-music';
```

The package has two builds, ESM (`import`) and CommonJS (`require`), both work.

### Removed

* `ytdl-core` and `yt-search` and everything that depended on them. If you used the `Status code: 403/404` errors of `ytdl-core`, check `providerFailed` and `error` events instead.
* `lyrics-finder` (it stopped finding lyrics). Use the `lyrics` option for another service.
* `player.utils.getUniqueID()` (it was only needed by the server playlists; use `crypto.randomUUID()` if you need an ID) and the unused error texts `playingPaused` and `playingResumed` of `player.errors` (an already paused or already playing queue gives the `INVALID_STATE` error). `player.utils.getTrackDuration(url)` is **deprecated**: it still works, but the duration is in the tracks that `player.search()` returns (`track.duration`) and `player.sources.resolve(url)` gives `seconds`.
* **Server playlists** (the playlists of a Discord server saved by the module) and the JSON database that kept them. They were in 1.x and are removed in 2.0 without deprecated aliases, so code that uses them stops working (breaking change): it is an extra feature that every bot can build for itself in a few lines.

```diff
- player.playlists.create / addTrack / play / removeTrack / delete
- player.database.get / write / initGuild
- options.databaseConfig, options.databaseConfig.path, options.databaseConfig.checkInterval
- player#createdPlaylist, player#deletedPlaylist, Events.PLAYLIST_CREATED, Events.PLAYLIST_DELETED
- GuildPlaylist, PlaylistTrack, CreatePlaylistData, AddPlaylistData, DatabaseManagerConfiguration, DatabaseStorage
- PlayerErrorCode.PLAYLIST_NOT_FOUND, GUILD_PLAYLISTS_NOT_FOUND, PLAYLIST_TRACK_NOT_FOUND, PLAYLIST_TRACK_EXISTS
- PlaylistsManager, DatabaseManager
```

  The module does not read or write the `dpm.playlists.json` file any more. You can delete it, or read it yourself (it is plain JSON: `{ "<guildID>": { "playlists": [{ "id", "title", "author", "tracks": [{ "url", "title" }], ... }] } }`) to move your old playlists to your own storage. Playing a **YouTube** playlist link is a different feature and stays (`player.search()` with a playlist link, `playlistLimit`).

  To keep playlists yourself, store the links in any storage (a `Map`, a database, a JSON file) and add them one by one with `player.search()`, it keeps their order:

```ts
const playlists = new Map<string, Array<string>>(); // playlist name -> track links
playlists.set('chill', ['https://www.youtube.com/watch?v=Vt2TeOptLxE', 'https://www.youtube.com/watch?v=1Qo35ldlvWo']);

// Play the playlist: every link is added to the queue, the first one starts playing
for(const url of playlists.get('chill') ?? []) await player.search(url, message.member, message.channel);
```
