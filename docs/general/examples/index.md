# Examples

This is a small part of what can be done. A complete bot that you can run locally is in the [examples folder](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples): [`bot.ts`](https://github.com/xyligan-gp/discord-player-music/blob/stable/examples/bot.ts), a bot with all the main commands. It is written in TypeScript and checked by the compiler on every change of the module, so it always matches the API. In a JavaScript project remove the types; the module works with `import` and `require` the same way.

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

### Server playlists

```ts
// Create a playlist with the first track, add more tracks, play and delete it
const playlist = await player.playlists.create(message.guild.id, { title: 'My playlist', author: message.author.id, track: { url, title } });

await player.playlists.addTrack(message.guild.id, { id: playlist.id, track: { url: otherURL, title: otherTitle } });
await player.playlists.play(message.guild.id, playlist.id, message.member, message.channel);
await player.playlists.delete(message.guild.id, playlist.id);
```

## Events

```ts
player.on('playingTrack', track => track.channel.text.send(`Now playing: **${track.title}**`));
player.on('addedTrack', track => track.channel.text.send(`Added to the queue: **${track.title}**`));
player.on('queueStarted', queue => console.log('Queue started on', queue.channel.voice.guild.name));
player.on('queueEnded', queue => queue.channel.text.send('The queue has ended.'));
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

See the [Providers page](../providers.md) for changing the order of the sources, yt-dlp options (cookies, proxy), and writing your own source or lyrics provider.
