# Frequently Asked Questions

These questions are some of the most frequently asked.

## What do I need to run the module?
* **Node.js 22.12.0 or newer** and **discord.js 14.28 or newer**.
* The bot needs the `Guilds`, `GuildVoiceStates` intents and, to read commands from messages, `GuildMessages` and `MessageContent`. It must have the *Connect* and *Speak* permissions in the voice channel.
* Everything else is installed with the module: `@discordjs/voice`, FFmpeg (`ffmpeg-static`) and an Opus encoder (`opusscript`). You do not need to install `@discordjs/opus`. If you want a faster native encoder, install `@discordjs/opus` yourself, the module will use it.

## There is no sound / FFmpeg was not found
The FFmpeg binary is downloaded by the install script of the `ffmpeg-static` package. Some package managers do not run install scripts by default (npm 12, pnpm 10). Allow the script (for example `npm install-scripts approve ffmpeg-static`, then `npm rebuild ffmpeg-static`) or install FFmpeg in your system: the module uses `ffmpeg` from `PATH` when the downloaded binary does not exist.

## A track does not play / I see `YouTube does not allow to download the whole audio (status 403)`
YouTube does not give the audio of some videos to the main source (`youtubei.js`) without a *PO token*, a proof that the request comes from a real client. In that case the module uses the next provider, **yt-dlp**, and you will see this line in the log of `providerFailed` events. After one such failure the module sends the next tracks (any videos) to yt-dlp first for 10 minutes, then tries the main source again. This is normal. The order of the sources and the other options are described on the [Providers page](https://dpm.js.org/#/docs/discord-player-music/stable/general/providers).

If the track still does not play (the `error` event says that all providers failed):
1. Check that yt-dlp works: `new YtDlpProvider()` finds `yt-dlp` in `PATH` or downloads it, and needs access to GitHub. Without internet access to GitHub install it yourself (`pip install yt-dlp`, `winget install yt-dlp.yt-dlp`, a package of your system) or give the path with the `command` option.
2. Update yt-dlp: YouTube changes often and old versions stop working. The binary downloaded by the module is checked every time the player starts (at most once per hour): when a newer release exists, the module downloads it; an yt-dlp that you installed yourself you update yourself (`yt-dlp -U`).
3. The video can be unavailable in your country, private, age-restricted or removed. Age-restricted videos need cookies: `new Player(client, { cookies: 'cookies.txt' })` (see the question about cookies below).
4. If the bot runs on a hosting, its IP address can be blocked by YouTube ("Sign in to confirm you're not a bot"). Use cookies (see the question about cookies on a server below) or a proxy (`extraArgs: ['--proxy', 'http://host:port']`) or run the bot from another network. Using the cookies of your account can lead to its ban, use a separate account.

## An age-restricted video does not play (`SIGN_IN_REQUIRED`)
Videos with an age restriction can be played only by a signed-in account that is allowed to watch them, so both sources fail and `player.search()` rejects with `SIGN_IN_REQUIRED` (`error.cause` has the details). Give the cookies of such an account, see the next question: `new Player(client, { cookies: '/path/to/cookies.txt' })`.

## Do I need cookies on a Linux server (without a browser)?
**Often not**, so try without them first. YouTube asks to sign in ("Sign in to confirm you're not a bot") mostly when the IP address of the bot belongs to a hosting provider or a data center, and it depends on the provider and on the time. If it happens, the error of the track says it and mentions the `cookies` option. What you can do, from the most reliable:

1. **Cookies of an account.** yt-dlp can use the cookies of a signed-in YouTube account. A server has no browser, so export the cookies on a computer with a browser and copy the file to the server:
   * sign in to YouTube in a **private (incognito) window** with a **separate Google account** (not your main one: using cookies can get an account banned),
   * export the cookies of `youtube.com` in the Netscape format (for example with the browser extension *Get cookies.txt LOCALLY*, or on your computer `yt-dlp --cookies-from-browser chrome --cookies cookies.txt --skip-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"`),
   * **close the private window** right away: YouTube rotates the cookies of an open browser session, and an exported copy becomes invalid,
   * put `cookies.txt` on the server (not into git!) and pass the path in the `cookies` option of the player: **one file is used by both sources**, `yt-dlp` (`--cookies`) and `youtubei.js` (signed-in session):

   ```js
   new Player(client, { cookies: '/path/to/cookies.txt' });

   // or for your own list of sources
   new Player(client, { sources: [new YoutubeiProvider({ cookies: '/path/to/cookies.txt' }), new YtDlpProvider({ cookies: '/path/to/cookies.txt' })] });
   ```

   The cookies expire after some time (weeks or months): when tracks stop playing again with the sign-in error, export them again.
2. **A proxy or another network.** If the IP address is blocked, use a proxy in the same way (`new YtDlpProvider({ extraArgs: ['--proxy', 'http://user:password@host:port'] })`) or run the bot from another network (for example from a home server). Residential proxies work better than data center ones.
3. **A PO token provider for yt-dlp.** There is a yt-dlp plugin that makes PO tokens on a server (`bgutil-ytdlp-pot-provider`, it works without a browser). It is an advanced option, see the yt-dlp documentation about PO tokens.

The module reads the file and uses the cookies of `youtube.com` only for requests to YouTube; it does not save or send them anywhere else. `youtubei.js` uses them for the information of age-restricted videos and for private playlists (its iOS client, which receives the audio, does not accept cookies), the audio of such videos is played by yt-dlp. If the file is missing or has no valid cookies (they expired), the provider reports it with the `error` event when the player starts. yt-dlp updates the cookies file by itself while it works (YouTube rotates some cookies), so give the process the right to write to it.

## How do I see which source plays a track?
Listen to these events (they are meant for debugging and for telling the users what happens):

```js
// Which source gives the audio of a track, and whether it was prepared in advance (the next track is prepared before the current one ends).
// `via` is set when a provider plays the audio of another one (for example a provider that finds the audio of a track in another source)
player.on('sourceUsed', ({ provider, via, track, seek, prefetched }) => console.log(`${provider}${via ? ` (${via})` : ''} plays ${track.title}`));

// Every step of finding, checking, downloading and updating yt-dlp (it starts when the player is created)
player.on('ytdlpStatus', ({ stage, message, version, latest }) => console.log(`[yt-dlp] ${stage}: ${message}`));

// A source failed and the module moves to the next one
player.on('providerFailed', ({ provider, method, error }) => console.warn(`${provider} failed to ${method}: ${error.message}`));

// No source could play the track: it is skipped and the queue goes on with the next one (`next` is null at the end of the queue)
player.on('skippedTrack', ({ track, next, error }) => console.warn(`Skipped ${track.title}: ${error.message}`));
```

The `error` event is emitted for the same failed track too, `skippedTrack` adds the next track and is easier to use for a message to the users.

Every track has a `source` field with the name of the provider that found it (`youtubei` or `yt-dlp`).

## Can I play a playlist?
Yes, give a link to a YouTube playlist (`https://www.youtube.com/playlist?list=...` or a video link with `list=...`) to `player.search()`: all its tracks (up to `playlistLimit`, 100 by default) are added to the queue and playback starts from the first one. Automatic mixes (`list=RD...`), *Liked videos* and *Watch later* cannot be loaded.

## How do I make the bot play related tracks when the queue ends (autoplay)?
Turn the autoplay on: `new Player(client, { autoplay: true })` for all new queues, or `player.queue.setAutoplay(guildID, true)` for one queue (it switches the status when you do not pass it). When the tracks are over and no loop is on, the module finds related tracks, adds them and goes on playing, until the autoplay is turned off. **`autoAddingTracks` is not the autoplay:** it only adds the result of `player.search()` to the queue. Details: the [Providers page](https://dpm.js.org/#/docs/discord-player-music/stable/general/providers).

## How do I show a progress bar that moves in the "now playing" message?
Turn the event on with the `progressInterval` option (seconds, for example `10`; `0`, the default, is off) and edit your message in the `trackProgress` event: it gives `{ track, position, duration, bar, percents }` while a track plays. Discord limits how often a message can be edited, so do not use less than 5 seconds. A full example is on the [Examples page](https://dpm.js.org/#/docs/discord-player-music/stable/general/index).

## Is there a pause between tracks?
The module prepares the next track in advance (20 seconds before the current one ends, see `prefetchSeconds`), so there should be none. The first track of a queue needs a moment to start (up to 5 seconds with yt-dlp).

## Why do I get `PlayerError` instead of an object with `error`?
Starting with version 2.0 methods throw errors instead of returning `{ error: { code, message } }`. See the [updating page](https://dpm.js.org/#/docs/discord-player-music/stable/general/updating) for the full list of changes.

```js
try {
	await player.queue.skipTrack(message.guild.id);
}catch(error) {
	if(error instanceof PlayerError && error.code === PlayerErrorCode.QUEUE_NOT_FOUND) return message.channel.send('Nothing is playing!');

	throw error;
}
```

## Why does the bot sometimes just crash?
Always handle the errors of the methods (`try/catch`) and listen to the `error` event: an `error` event without listeners is only printed to the console, but an unhandled rejection of your own code can stop the process. Look at the error message and the `code` of `PlayerError`; if you can not solve it, contact the support server.

## Do the lyrics work for any language?
Lyrics are taken from the free [LRCLIB](https://lrclib.net) service, which has songs in many languages (for example Russian songs). Write the artist and the title in the query: `player.lyrics('Artist Title')`. You can use another service with your own `LyricsProvider` (the `lyrics` option).

## Is it allowed to use the module with YouTube?
Downloading streams is against the YouTube Terms of Service, and the authors of the module do not give legal advice. You use the module at your own risk. The module does not bypass authorization or DRM, it does what yt-dlp and similar tools do.
