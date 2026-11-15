# Module Changelog
* ***Version 1.0.0***
  * Release module
* ***Version 1.0.1***
  * Code optimization
  * Fix methods `joinVoiceChannel()` and `leaveVoiceChannel()`
  * Added the `formatNumbers()` method for formatting numbers
  * Fix bugs
  * Fix `README.md`
* ***Version 1.0.2***
  * Code optimization
  * Fixed bug with repeating song/queue
  * Improving the quality of playing songs
  * Added filter system. Method `setFilter()`
  * Changing the returned data by some methods and events
  * Added the `getGuildMap()` method to get the server queue object
* ***Version 1.0.3***
  * Code optimization
  * Fix caught some bugs
  * Fixed minor bugs
  * Rewrite `README.md`
  * Fixed events
* ***Versions 1.0.4 - 1.0.5***
  * Update versions all dependencies
  * Fix `README.md`
* ***Version 1.0.6***
  * Fix module typings
  * Fix minor bugs
  * Added the `getFilters()` method to get arrays with player filters
  * Fix `README.md`
* ***Version 1.0.7***
  * Update versions all dependencies
* ***Version 1.0.8***
  * Fix method `searchVideo()`
  * Added the `getLyrics()` method to get lyrics for current song
* ***Version 1.1.0***
  * Fix filter system
  * Added the `shuffle()` method for shuffling songs in queue
* ***Version 1.1.1***
  * The `playerError` event has started to catch more errors about which users can be warned
  * When receiving an error `Status code: 403`, the module will restart the stream (previously, the stream simply ended)
  * Add the `removeSong()` method for removing songs from the queue
  * Completely rewritten `README.md`
  * Release of module documentation. Link: [dpm-docs](https://dpm-docs.tk)
* ***Version 1.1.2***
  * Updating the documentation for the new design style
  * The module structure has been completely rewritten
  * Added class `Utils`, some methods have been moved to it and marked as `public`
* ***Version 1.1.3***
  * Remove dependency on `<Discord.Message>` completely
  * The `searchVideo()` method has been replaced with `searchSong()`
  * Completely rewritten TypeScript code
  * The `getSongIndex()` and `addSong()` methods have been changed
  * The `playerError` event have been changed
* ***Version 1.1.5***
  * The module structure has been completely rewritten on managers
  * Completely rewritten `README.md`
  * Rewritten TypeScript code
  * Correction of bugs and errors
  * Adding support for `discord.js v13`
  * and many other changes...
* ***Version 1.1.6***
  * Fix Voice Manager
* ***Version 1.1.7***
  * The module has been completely rewritten to the new structure and the TypeScript language
  * Replaced old domain [dpm-docs](https://dpm-docs.tk) with new one [dpm-website](https://dpm.js.org)
  * Added new managers, simplified work with old ones
  * Optimization of module algorithms
  * Added server playlist functionality
  * Removed support for `discord.js v12` and added support for the current `discord.js v14`
  * Updated dependency versions to the latest ones
  * Updated old and added new events
  * Partial transition to enumerated types (enum)
  * The rest of the changes can be seen more clearly on the updates page...

* ***Version 2.0.0***
  * **Breaking:** Node.js 22.12.0 or newer and discord.js 14.28 or newer are required, `@discordjs/voice` was updated to 0.19
  * **Breaking:** methods throw `PlayerError` (with `code`, `status` and `cause`) instead of returning `{ error }`, see the updating page
  * Fixed YouTube playback: `ytdl-core` and `yt-search` were replaced with replaceable source providers (`SourceRegistry`, `YoutubeiProvider`, `YtDlpProvider`)
  * Automatic fallback between providers, the `providerFailed`, `sourceUsed` (which source plays a track), `ytdlpStatus` (every step of finding, checking, downloading and updating yt-dlp) and `skippedTrack` (a track could not be played, the queue goes on with the next one) events and the `sources`, `sourceFailureThreshold` and `sourceCooldown` options
  * `yt-dlp` is found in `PATH` or downloaded automatically when the player starts (the checksum is verified), and a newer release is installed at every start; the `cookies` option (one cookies file for both `youtubei.js` and yt-dlp: `youtubei.js` reads the information of age-restricted videos and private playlists with it, yt-dlp plays them) for servers where YouTube asks to sign in
  * `SIGN_IN_REQUIRED` error for age-restricted videos and bot checks (the cookies are needed)
  * yt-dlp errors are thrown before the stream starts (so the next provider is used) and explain the sign-in request
  * YouTube playlist links: all tracks are added to the queue and start playing (`playlistLimit` option, `Search.PLAYLIST`)
  * The next track is prepared in advance (`prefetchSeconds` option), no pause between tracks
  * Lyrics from LRCLIB (`lyrics-finder` stopped working), the `lyrics` option and `LyricsProvider` interface
  * Tracks that can not be played are skipped, the queue no longer hangs
  * Every `Player` has its own event emitter, an `error` event without listeners no longer crashes the process
  * Collectors: the user can cancel a selection (the word `cancel` or the `❌` reaction, `COLLECTOR_CANCELLED`), wrong answers use up the attempts and the user can try again (a wrong answer ended with a timeout error before), emojis are compared without the invisible variation selector (a reaction could be ignored), the message of the small-number error showed `{max}` instead of the minimum; `createCollector()` is covered by tests
  * Fixed: removing the playing track skipped the next one; `synchronLoop: false` was ignored; `setVolume()` without a value; collectors never finished; leaking listeners on every track; the filter restarted the track from the beginning; `VoiceManager#join` crash
  * `SourceProvider` is extended for external packages: the optional `attach` and `audioProvider` members, the `via` field of the `sourceUsed` event, the error codes `SOURCE_RATE_LIMITED`, `SOURCE_UNAUTHORIZED` and `AUDIO_NOT_FOUND`, and `SourcePlaylist` is exported.
  * Removed (breaking change, no deprecated aliases): server playlists from 1.x (`player.playlists`, the events `createdPlaylist` and `deletedPlaylist`, the related types and error codes) and the JSON database that kept them (`player.database`, `databaseConfig`). It is an extra feature that every bot can build for itself, see the [updating page](https://dpm.js.org/#/docs/discord-player-music/stable/general/updating) for a short example. Playing a YouTube playlist link is not removed
  * Removed `player.utils.getUniqueID()` and two unused error texts; `player.utils.getTrackDuration()` is deprecated
  * **Autoplay:** when the tracks are over (and no loop is on) the module finds related tracks, adds them and goes on playing them until it is turned off: the `autoplay`, `autoplayLimit`, `autoplayHistory` and `autoplayMaxDuration` options, `player.queue.setAutoplay()`, the `autoplayAdded` event, `Search.AUTOPLAY`, the optional `related()` method of `SourceProvider` (`YoutubeiProvider` uses the up next feed of YouTube, the other providers fall back to a search by the author and the title). `autoAddingTracks` is not the autoplay: it only adds the result of `player.search()` to the queue
  * **Live progress:** the `progressInterval` option (seconds, `0` by default) and the `trackProgress` event `(queue, { track, position, duration, bar, percents })`, emitted while a track plays, for a "now playing" message that moves
  * `YoutubeiProvider` hides the parser warnings of `youtubei.js` (the `warnings` option shows them)
  * New helpers `player.utils.parseDuration()` (`'10m'` to milliseconds), `player.utils.formatMilliseconds()` (milliseconds to `2m` or `2 minutes`) and `player.utils.splitMilliseconds()` (milliseconds to days, hours, minutes and seconds)
  * **Changed:** `queueEnded` now has a second argument `reason` (`ended`, `stopped`, `deleted`, `skipped`, `error`) and is emitted once every time a queue is closed, not only when the tracks are over (check `reason === 'ended'` for the old behaviour). Invalid options are still replaced with the defaults, but the module now tells about them with `console.warn`
  * Types are generated from the code, ESM and CommonJS builds, JSDoc for the whole public API
  * Added tests, linting, a JSDoc check and CI workflows
