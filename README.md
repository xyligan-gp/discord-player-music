<div align="center">
	<h1>Welcome to the 'discord-player-music' page!</h1>
	<br />
	<p>
		<a href="https://dpm.js.org"><img src="https://i.imgur.com/4Pk9WlS.gif" width="546" alt="DPM Main Image" /></a>
	</p>
	<br/>
	<p>
		<a href="https://discord.gg/zzbkvCcu2r"><img src="https://img.shields.io/discord/827221018879328298?color=5865F2&logo=discord&logoColor=white" alt="Support Server" /></a>
		<a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/dt/discord-player-music.png?maxAge=3600" alt="NPM downloads" /></a>
		<a href="https://www.npmjs.com/package/discord-player-music"><img src="https://img.shields.io/npm/v/discord-player-music.png?maxAge=3600" alt="NPM page" /></a>
	</p>
</div>

## About

**Discord Player Music is a powerful [Node.js](https://nodejs.org) music module for your [discord.js](https://discord.js.org) bot. It is based on Promises, fully typed and has a lot of features.**

* 👍 Simple & easy to use
* 😄 Beginner friendly
* 🎶 Replaceable track sources: YouTube through `youtubei.js` with an automatic `yt-dlp` fallback
* 📃 YouTube playlist links
* 🎸 Audio filters
* 📝 Lyrics
* 📂 Multiple servers
* 🧩 Typed errors, JSDoc for the whole API, ESM and CommonJS

## Installation

**Node.js 22.12.0 or newer and discord.js 14.28 or newer are required.**

```sh-session
$ npm install discord-player-music discord.js
$ yarn add discord-player-music discord.js
$ pnpm add discord-player-music discord.js
```

Audio is converted with FFmpeg, which comes with the `ffmpeg-static` package. Some package managers do not run install scripts by default (npm 12 and pnpm 10 ask you to allow them): if the FFmpeg binary is missing, allow the install script of `ffmpeg-static` (`npm install-scripts approve ffmpeg-static`) or install FFmpeg in your system, the module finds it in `PATH`.

[yt-dlp](https://github.com/yt-dlp/yt-dlp) is used as a fallback source for YouTube. **You do not need to install it:** if it is not found in `PATH`, the module downloads the official binary from GitHub into `~/.cache/discord-player-music`, checks its checksum and updates it once a day. See the [Providers page](https://dpm.js.org/#/docs/discord-player-music/stable/general/providers) to change or disable that.

## Example Usage

```js
import { Client, GatewayIntentBits } from 'discord.js';
import { Player, PlayerError } from 'discord-player-music';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	]
});

const player = new Player(client);

player.on('ready', () => console.log('Player is ready!'));
player.on('playingTrack', track => track.channel.text.send(`Now playing: **${track.title}**`));
player.on('error', ({ error }) => console.error(error));

client.on('messageCreate', async message => {
	if(!message.content.startsWith('!play ') || !message.member?.voice.channel) return;

	try {
		// A track title or a link to a video or a playlist
		const tracks = await player.search(message.content.slice(6), message.member, message.channel);

		// A link is added to the queue by itself, for a title the first result is taken
		if(tracks[0].searchType.includes('title')) await player.initQueueTrack(1, tracks);
	}catch(error) {
		message.channel.send(error instanceof PlayerError ? error.message : 'Something went wrong!');
	}
});

client.login('YOUR_CLIENT_TOKEN_HERE');
```

More examples are in the [`examples`](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples) folder.

## Good to know

* **Methods throw errors.** Every method rejects with a `PlayerError` that has a `code` (for example `QUEUE_NOT_FOUND`), so use `try/catch` (or `.catch()`).
* **YouTube changes often.** Any YouTube library can stop working after a change on YouTube's side. That is why the module has several sources: when `youtubei.js` is refused, `yt-dlp` plays the track and the module remembers it for the next tracks. See the [FAQ](https://dpm.js.org/#/docs/discord-player-music/stable/general/faq) if a track does not play, and the [Providers page](https://dpm.js.org/#/docs/discord-player-music/stable/general/providers) to change the order of the sources or write your own.
* **Respect the rules.** Downloading streams is against the YouTube Terms of Service, and some hosting providers are blocked by YouTube. Use the module at your own risk.

## Links

* NPM: [Open](https://www.npmjs.com/package/discord-player-music)
* GitHub: [Open](https://github.com/xyligan-gp/discord-player-music)
* Examples: [See](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples)
* Documentation: [Open](https://dpm.js.org)

* Module Developer: [xyligan](https://github.com/xyligan-gp)
* Developer Discord: [xyligan / @whatisgif](https://discord.com/users/533347075463577640)
* Support Server: [Join xyligan development](https://discord.gg/zzbkvCcu2r)

<center><h1>♥ Thanks for using Discord Player Music ♥</h1></center>
