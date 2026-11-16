# Examples

This is a small part of what can be done. A complete bot that you can run locally is in the [examples folder](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples): [`bot.ts`](https://github.com/xyligan-gp/discord-player-music/blob/stable/examples/bot.ts), a bot with all the main commands. It is written in TypeScript and checked by the compiler on every change of the module, so it always matches the API. In a JavaScript project remove the types; the module works with `import` and `require` the same way.

## The test bot

[`bot.ts`](https://github.com/xyligan-gp/discord-player-music/blob/stable/examples/bot.ts) is made for checking the whole module by hand: it has a command for every feature, shows embeds and plain messages, and writes every event of the player to the console. Run it as written in the first lines of the file, then send `!help` to get the list in an embed. The bot needs the **Embed Links** permission for the embeds.

| Group | Commands | What they show |
| --- | --- | --- |
| Playback | `!play <title or link>`, `!search`, `!pick`, `!pause`, `!resume`, `!toggle`, `!skip`, `!replay`, `!stop`, `!delete`, `!seek <time>`, `!volume [n]`, `!loop [track\|queue\|off\|status]`, `!autoplay [on\|off]`, `!shuffle`, `!remove <index>`, `!clear` | `player.search`, `initQueueTrack`, `initGuildTrack`, `queue.add`, `setState`, `skipTrack`, `stop`, `delete`, `seek`, `setVolume`, `setLoop`, `setAutoplay`, `shuffle`, `removeTrack`; video and playlist links; the collectors |
| Information | `!nowplaying`, `!queue [page]`, `!state`, `!lyrics [query]`, `!stats`, `!config`, `!help` | `queue.trackInfo`, `progress`, `streamInfo`, `get`, `player.lyrics`, `version`, `readyAt`, `isReady`, `queue.size`, the resolved options; embeds, buttons for the pages of the queue |
| Voice | `!join`, `!leave` | `player.voice.join`, `player.voice.leave` |
| Filters | `!filters`, `!filter <name\|clear>`, `!filter add <name> <value>`, `!filter remove <name>`, `!filter info <name>` | `queue.setFilter`, `player.filters` (`list`, `add`, `delete`, `isExists`, `get`) |
| Sources | `!sources [link]`, `!ytdlp`, `!prefetch [seconds]`, `!autoadd [on\|off]`, `!utils [warn]`, `!debug [on\|off]` | `player.sources.list`, `canHandle`, `isPlaylist`, the `ytdlpStatus` event, `prefetchSeconds`, `autoAddingTracks`, `player.utils`, the warnings of `checkOptions`, the technical events |
| Collectors | `!search`, `!pick`, `!collector message\|reaction [tracks]` | `player.createCollector`, attempts, cancel, errors |

The "Now playing" message of the bot moves by itself (no command): when a track starts, the bot sends a message with the track, the progress bar and `position / duration`, edits it on every `trackProgress` event, and deletes it when the next track starts or the queue is closed (there is exactly one message per track, the old announcement of the track is merged into it). The bot sets `progressInterval` from `PROGRESS_INTERVAL` in `examples/.env` (seconds, `5` by default, values below 3 are raised to 3, `0` turns the event off: the message is then sent once, with 0:00 progress, and not edited); Discord limits how often a message can be edited, so use 5 seconds or more.

Times for `!seek` can be `90`, `1:30`, `1:02:03` or `1m30s`. The numbers in `!queue` are the indexes for `!remove` (0 is the playing track).

Every event of the player is shown (including `autoplayAdded`): `ready`, `queueStarted`, `addedTrack`, `playingTrack`, `queueStateChange`, `queueEnded` (with the reason), `skippedTrack`, `error`, `providerFailed`, `ytdlpStatus` and `sourceUsed` (with `via`). The main ones are sent to the text channel, the technical ones (`providerFailed`, `ytdlpStatus`, `sourceUsed`) go to the channel only after `!debug on`.

Errors of the module (`PlayerError`) are shown in an embed with the `code` and the `status`, so wrong commands do not crash the bot: for example `!resume` on a queue that is not paused gives `INVALID_STATE`, `!queue` without a queue gives `QUEUE_NOT_FOUND`.

What the bot does not show: the failure counters of the source registry (they are internal), a manual update of yt-dlp (it updates when the player starts), and the commands "previous track" and "jump to a track" (the module does not have them; `!clear` is made with `removeTrack`).

## Client and module initialization

```ts
import { Client, GatewayIntentBits } from 'discord.js';
import { Collector, GuildQueueState, Loop, Player, PlayerError, PlayerErrorCode, Search } from 'discord-player-music';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	]
});

const prefix = '!';
const player = new Player(client);

player.on('ready', () => console.log('Player is ready!'));
```

## Handling errors

Methods reject with a `PlayerError` that has a `code`. Wrap the commands in one `try/catch`:

```ts
client.on('messageCreate', async message => {
	if(message.author.bot || !message.inGuild() || !message.content.startsWith(prefix)) return;

	const [command, ...args] = message.content.slice(prefix.length).split(' ');

	try {
		// ...commands (see below)
	}catch(error) {
		if(error instanceof PlayerError) {
			if(error.code === PlayerErrorCode.QUEUE_NOT_FOUND) return void message.channel.send('Nothing is playing now!');

			return void message.channel.send(error.message);
		}

		console.error(error);
	}
});
```

## Writing bot commands

### Play command

A title gives a list of results, a link to a video is added to the queue by itself, and a link to a **playlist** adds all its tracks and starts playing them.

```ts
if(command === 'play') {
	if(!message.member?.voice.channel) return void message.channel.send('Join a voice channel first!');

	const query = args.join(' ');
	const results = await player.search(query, message.member, message.channel);

	// A playlist link: all tracks are already in the queue
	if(results[0].searchType === Search.PLAYLIST) return void message.channel.send(`Added ${results.length} tracks from the playlist.`);

	// A video link: the track is already in the queue
	if(results[0].searchType === Search.URL) return;

	// A title: choose a track by a number. The chosen track is added to the queue by the collector.
	const list = await message.channel.send(results.map((track, index) => `${index + 1}. ${track.title}`).join('\n'));

	await player.createCollector(Collector.MESSAGE, list, results, message.author.id);
}
```

To take the first result without asking: `await player.initQueueTrack(1, results)`.

### Reaction collector

For up to 10 results you can choose with reactions (`1⃣`...`🔟`). The bot adds the number reactions and a cross (`❌`) that cancels the selection. It needs the **Add Reactions** and **Read Message History** permissions and the `GuildMessageReactions` intent:

```ts
const list = await message.channel.send(results.map((track, index) => `${index + 1}. ${track.title}`).join('\n'));

await player.createCollector(Collector.REACTION, list, results, message.author.id);
```

### How a selection ends

`createCollector()` resolves with `{ index, track, data }` when the user selects a track. Otherwise it rejects with a `PlayerError`:

| `code` | When |
| --- | --- |
| `COLLECTOR_TIMEOUT` | The time is over and nothing was selected (`collectorsConfig.message.time`, 1 minute; `collectorsConfig.reaction.time`, 30 seconds) |
| `COLLECTOR_CANCELLED` | The user wrote the cancel word (`cancel`) or pressed the cancel reaction (`❌`), or the list message was deleted |
| `INVALID_VALUE`, `COLLECTOR_SMALL_VALUE`, `COLLECTOR_LARGE_VALUE` | The attempts are used up by wrong answers (not a number or an unknown reaction, a number below 1, a number above the size of the list) |
| `COLLECTOR_UNKNOWN` | More than 10 results for the reaction collector |
| `COLLECTOR_NO_RESULTS`, `MISSING_PARAMETER` | An empty list, a missing parameter (the user ID is required for reactions) |

Every message (or reaction) of the user is an **attempt**: with `attempts: 3` the user can make two mistakes and select a track with the third answer. The cancel word and the cancel reaction can be changed or turned off:

```ts
new Player(client, {
	collectorsConfig: {
		message: { time: '1m', attempts: 3, cancel: 'stop' },     // cancel: false turns the cancel word off
		reaction: { time: '30s', attempts: 2, cancel: false }      // cancel: false: no cancel reaction
	}
});
```

The complete bot [`bot.ts`](https://github.com/xyligan-gp/discord-player-music/blob/stable/examples/bot.ts) has the commands `!search <title>` (message collector), `!pick <title>` (reaction collector) and the tests `!collector message` and `!collector reaction`, which run the collectors on fake tracks with 3 attempts.

### Queue controls

```ts
// Pause and resume
await player.queue.setState(message.guild.id, GuildQueueState.PAUSED);
await player.queue.setState(message.guild.id, GuildQueueState.PLAYING);

// Skip (returns the skipped and the next track)
const { current, next } = await player.queue.skipTrack(message.guild.id);

// Queue and the current track
const { tracks } = await player.queue.get(message.guild.id);
const progress = await player.queue.progress(message.guild.id); // { bar: '▬▬🔘▬▬▬▬▬▬▬▬', percents: '23%' }

// Loop the track or the queue, volume, seek, shuffle
await player.queue.setLoop(message.guild.id, Loop.QUEUE);
await player.queue.setVolume(message.guild.id, 10);
await player.queue.seek(message.guild.id, 90);
await player.queue.shuffle(message.guild.id);

// Remove a track (index 0 is the playing track: it is skipped) and stop the playback
await player.queue.removeTrack(message.guild.id, 2);
await player.queue.stop(message.guild.id);
```

### Audio filters

```ts
// Built-in filters: bassboost, nightcore, 3D, echo, karaoke, vaporwave, ... Use 'clear' to remove the filter
await player.queue.setFilter(message.guild.id, 'bassboost');

// Your own filter (the value is an FFmpeg audio filter)
await player.filters.add('quiet', 'volume=0.5');
await player.queue.setFilter(message.guild.id, 'quiet');
```

The track continues from the current position when the filter is changed.

### Lyrics

```ts
const lyrics = await player.lyrics('Imagine Dragons Thunder');

message.channel.send(`**${lyrics.artist} - ${lyrics.title}**\n\n${lyrics.result}`.slice(0, 1990));
```

## Autoplay

```ts
// Related tracks are added and played when the tracks are over (and no loop is on), until the autoplay is turned off
const player = new Player(client, { autoplay: true });

// The autoplay of one server: on, off, or switched when nothing is passed
await player.queue.setAutoplay(message.guild.id, true);

player.on('autoplayAdded', (queue, tracks) => queue.channel.text.send(`Autoplay: ${tracks.map(track => track.title).join(', ')}`));
```

## Live progress

```ts
// The event is off by default: ask for it with progressInterval (seconds). Discord limits how often a message can be edited, so use 5-10 seconds.
const player = new Player(client, { progressInterval: 10 });

const nowPlaying = new Map<string, Message>(); // guild ID -> the "now playing" message

player.on('playingTrack', async track => nowPlaying.set(track.guild.id, await track.channel.text.send(`Now playing: **${track.title}**`)));

player.on('trackProgress', (queue, { track, position, duration, bar, percents }) => {
	const time = (seconds: number) => player.utils.formatDuration(seconds).replace(/^00:/, '');

	nowPlaying.get(track.guild.id)?.edit(`Now playing: **${track.title}**\n${bar} ${percents} (${time(position)} / ${time(duration)})`).catch(() => { });
});
```

The event is not emitted while the queue is paused, and the timer stops when the queue is closed.

## Events

```ts
player.on('playingTrack', track => track.channel.text.send(`Now playing: **${track.title}**`));
player.on('addedTrack', track => track.channel.text.send(`Added to the queue: **${track.title}**`));
player.on('queueStarted', queue => console.log('Queue started on', queue.channel.voice.guild.name));
// A queue was closed: reason is 'ended' (the tracks are over), 'stopped' (queue.stop()), 'deleted' (queue.delete()), 'skipped' (the last track was skipped) or 'error' (the voice connection failed)
player.on('queueEnded', (queue, reason) => {
	if(reason === 'ended') queue.channel.text.send('The queue has ended.');
	else console.log(`Queue of ${queue.channel.voice.guild.name} closed: ${reason}`);
});
player.on('queueStateChange', (queue, oldState, newState) => console.log(oldState, '->', newState));

// A track that can not be played is skipped, you only need to tell the users
player.on('error', ({ channel, method, error }) => channel?.text?.send(`I can not play this track: ${error.message}`));

// A source provider failed and the next one is used (useful for debugging)
player.on('providerFailed', ({ provider, method, error }) => console.warn(`${provider} failed to ${method}: ${error.message}`));

// Which source gives the audio of a track
player.on('sourceUsed', ({ provider, track, seek, prefetched }) => console.log(`${provider} plays ${track.title}`));

// A track could not be played: it is skipped and the queue goes on with the next one (`next` is null at the end)
player.on('skippedTrack', ({ track, next, error }) => track.channel.text.send(`I can not play ${track.title}, skipping it${next ? `. Next: ${next.title}` : ''}`));
```

## Providers

See the [Providers page](https://dpm.js.org/#/docs/discord-player-music/stable/general/providers) for changing the order of the sources, yt-dlp options (cookies, proxy), and writing your own source or lyrics provider.
