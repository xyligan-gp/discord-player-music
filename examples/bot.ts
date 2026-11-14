// A complete music bot that you can run locally (TypeScript).
//
// 1. Install and build the module:            npm ci && npm run build
// 2. Create a `.env` file in the project root: DISCORD_TOKEN=your bot token
//    In the Discord developer portal enable "Message Content Intent" for the bot. The bot needs the permissions: Send Messages, Connect, Speak,
//    and for the reaction collector Add Reactions and Read Message History (the code asks for the GuildMessageReactions intent).
// 3. Run it:                                   node --env-file=.env examples/bot.ts      (Node.js 22.18 or newer runs .ts files, or use `npx tsx`)
//
// In your own project install the module (`npm install discord-player-music discord.js`) and import it in the same way.
//
// Commands: !play <title|video link|playlist link>, !pause, !resume, !skip, !stop, !queue, !now, !loop [track|queue],
// !volume <number>, !seek <seconds>, !shuffle, !filter <name|clear>, !lyrics <artist - title>, !providers
// Choosing a track from a list: !search <title> (answer with a number or `cancel`), !pick <title> (answer with a reaction, the cross cancels)
// Tests of the collectors: !collector message [tracks], !collector reaction [tracks]
import { existsSync } from 'node:fs';
import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import { Collector, GuildQueueState, Loop, Player, PlayerError, PlayerErrorCode, Search } from 'discord-player-music';
import type { PlayerTrack } from 'discord-player-music';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

const prefix = '!';
// `cookies` (the path of a cookies.txt file of a YouTube account) is only needed when YouTube asks your server to sign in or for age-restricted
// videos, see the FAQ. The file is taken from the COOKIES_FILE variable, or from examples/cookies.txt if it exists. Never commit it to git!
const cookies = process.env.COOKIES_FILE ?? (existsSync('examples/cookies.txt') ? 'examples/cookies.txt' : undefined);
const player = new Player(client, { cookies, sourceFailureThreshold: 3 });

if(cookies) console.log(`Using the cookies from ${cookies}`);

// Events of the player
player.on('ready', () => console.log('Player is ready!'));
player.on('playingTrack', track => track.channel.text.send(`Now playing: **${track.title}** (requested by ${track.requested})`));
player.on('addedTrack', track => track.channel.text.send(`Added to the queue: **${track.title}**`));
player.on('queueEnded', queue => queue.channel.text.send('The queue has ended.'));
player.on('error', ({ channel, method, error }) => {
    console.error(`[${method}]`, error);

    channel?.text?.send(`I can not play this track: ${error.message}`).catch(() => { });
});

// Shows which source provider failed and that the next one is used
player.on('providerFailed', ({ provider, method, error }) => console.warn(`[sources] ${provider} failed to ${method}: ${error.message}`));

// Every step of finding, checking, downloading and updating yt-dlp (it starts when the player is created)
player.on('ytdlpStatus', ({ stage, message, version, latest }) => console.log(`[yt-dlp] ${stage}${version ? ` (version ${version}${latest ? `, latest ${latest}` : ''})` : ''}: ${message}`));

// Which source gives the audio of a track (and whether it was prepared in advance), useful for debugging
player.on('sourceUsed', ({ provider, track, seek, prefetched }) => console.log(`[sources] ${provider} plays "${track.title}"${seek ? ` from ${seek}s` : ''}${prefetched ? ' (prepared in advance)' : ''}`));

// A track that could not be played is skipped and the queue goes on with the next one
player.on('skippedTrack', ({ track, next, error }) => {
    console.warn(`[player] skipped "${track.title}": ${error.message}`);

    track.channel.text.send(`I can not play **${track.title}**, skipping it${next ? `. Next: **${next.title}**` : ''}`).catch(() => { });
});

// ---- Collectors (selecting a track from a list) ----------------------------------------------------------------------------------------------
//
// A collector waits for the answer of the user to the list of tracks. Two kinds:
// * Collector.MESSAGE: the user writes the number of the track (or the word `cancel`)
// * Collector.REACTION: the user presses a number reaction (the cross reaction cancels). The bot needs the "Add Reactions" and
//   "Read Message History" permissions and the GuildMessageReactions intent.
// Every message or reaction of the user is an attempt (collectorsConfig.message.attempts and collectorsConfig.reaction.attempts, 1 by default).

/**
 * Tells how a selection ended in words
 */
function describeSelection(error: unknown): string {
    if(error instanceof PlayerError) {
        switch(error.code) {
            case PlayerErrorCode.COLLECTOR_TIMEOUT: return 'Time is over: nothing was selected.';
            case PlayerErrorCode.COLLECTOR_CANCELLED: return 'The selection was cancelled.';
            case PlayerErrorCode.COLLECTOR_UNKNOWN: return `Can not use this collector: ${error.message}`;
            case PlayerErrorCode.INVALID_VALUE:
            case PlayerErrorCode.COLLECTOR_SMALL_VALUE:
            case PlayerErrorCode.COLLECTOR_LARGE_VALUE: return `The attempts are used up (${error.code}): ${error.message}`;
            default: return `${error.code}: ${error.message}`;
        }
    }

    if(error instanceof Error && /Missing (Permissions|Access)/i.test(error.message)) return `I can not add reactions (${error.message}). Give the bot the "Add Reactions" and "Read Message History" permissions.`;

    throw error;
}

/**
 * Shows a list of tracks and lets the user choose one with a collector. The chosen track is added to the queue by the player (autoAddingTracks).
 */
async function choose(kind: 'message' | 'reaction', message: Message<true>, query: string): Promise<void> {
    const channel = message.channel as TextChannel;

    if(!message.member?.voice.channel) return void channel.send('Join a voice channel first!');
    if(!query) return void channel.send('Enter a title or a link!');

    // A video link is added to the queue by itself, a playlist link adds all its tracks and starts playing
    const found = await player.search(query, message.member, channel);

    if(found[0].searchType === Search.PLAYLIST) return void channel.send(`Added ${found.length} tracks from the playlist.`);
    if(found[0].searchType === Search.URL) return;

    // The reaction collector can show up to 10 tracks (the number reactions)
    const results = kind === 'reaction' ? found.slice(0, 10) : found;
    const list = results.map((track, index) => `${index + 1}. ${track.title}`).join('\n');
    const hint = kind === 'message' ? 'Write the number of the track (or `cancel`)' : 'Press the number reaction (❌ cancels)';
    const listMessage = await channel.send(`${hint}:\n${list}`);

    try {
        const selected = await player.createCollector(kind === 'message' ? Collector.MESSAGE : Collector.REACTION, listMessage, results, message.author.id);

        channel.send(`Selected track #${selected.index}: **${selected.track.title}**`);
    }catch(error) {
        channel.send(describeSelection(error));
    }
}

// Tests of the collectors. They use a second player that does not add the selected track to the queue (autoAddingTracks: false), so no music is
// needed, and 3 attempts and 30 seconds, so mistakes and retries can be tried. The tracks are fake.
const collectorsTest = new Player(client, {
    autoAddingTracks: false,
    collectorsConfig: { message: { time: '30s', attempts: 3 }, reaction: { time: '30s', attempts: 3 } },
    sources: [{ name: 'none', canHandle: () => false, search: async () => [], resolve: async () => { throw new Error('not used') }, stream: async () => { throw new Error('not used') } }]
});

async function testCollector(kind: string | undefined, count: number, message: Message<true>): Promise<void> {
    const channel = message.channel as TextChannel;

    if(kind !== 'message' && kind !== 'reaction') return void channel.send('Usage: `!collector message [tracks]` or `!collector reaction [tracks]` (5 tracks by default; try 12 with reaction to see the limit of 10)');

    const tracks: Array<PlayerTrack> = Array.from({ length: count }, (_, index) => ({
        index: index + 1,
        searchType: Search.TITLE,
        title: `Test track ${index + 1}`,
        url: `https://example.com/track/${index + 1}`,
        thumbnail: '',
        author: { name: 'Test', url: '' },
        channel: { text: channel, voice: message.member?.voice.channel as never },
        guild: message.guild,
        requested: message.author,
        duration: { hours: '00', minutes: '03', seconds: '00' }
    }));

    const config = collectorsTest.options.collectorsConfig[kind];
    const list = tracks.map(track => `${track.index}. ${track.title}`).join('\n');
    const how = kind === 'message'
        ? `write a number (or \`${config.cancel}\` to cancel)`
        : `press a number reaction (${config.cancel ? `${config.cancel} cancels` : 'no cancel reaction'})`;

    const listMessage = await channel.send(`**Collector test (${kind})**: ${how}. Attempts: ${config.attempts}, time: ${config.time}. Try a wrong answer, wait for the end, or cancel.\n${list}`);

    try {
        const selected = await collectorsTest.createCollector(kind === 'message' ? Collector.MESSAGE : Collector.REACTION, listMessage, tracks, message.author.id);

        channel.send(`✅ Selected #${selected.index}: **${selected.track.title}** (the track was not added to any queue)`);
    }catch(error) {
        channel.send(`❌ ${describeSelection(error)}`);
    }
}

client.on('messageCreate', async (message: Message) => {
    if(message.author.bot || !message.inGuild() || !message.content.startsWith(prefix)) return;

    const [command, ...args] = message.content.slice(prefix.length).split(' ');
    const rest = args.join(' ');
    const guildID = message.guild.id;
    const channel = message.channel as TextChannel;

    try {
        switch(command) {
            // The title gives a list of results and the user chooses a track by a number (the message collector)
            case 'play':
            case 'search': await choose('message', message, rest); break;

            // The same with the reaction collector
            case 'pick': await choose('reaction', message, rest); break;

            // Tests of the collectors on fake tracks: !collector message|reaction [number of tracks]
            case 'collector': await testCollector(args[0], Number(args[1]) || 5, message); break;

            case 'pause': await player.queue.setState(guildID, GuildQueueState.PAUSED); channel.send('Paused.'); break;
            case 'resume': await player.queue.setState(guildID, GuildQueueState.PLAYING); channel.send('Resumed.'); break;

            case 'skip': {
                const { current, next } = await player.queue.skipTrack(guildID);

                channel.send(`Skipped **${current.title}**${next ? `, next: **${next.title}**` : ''}`);

                break;
            }

            case 'stop': await player.queue.stop(guildID); channel.send('Stopped.'); break;

            case 'queue': {
                const { tracks } = await player.queue.get(guildID);

                channel.send(tracks.slice(0, 10).map((track, index) => `${index + 1}. ${track.title}`).join('\n') + (tracks.length > 10 ? `\n...and ${tracks.length - 10} more` : ''));

                break;
            }

            case 'now': {
                const track = await player.queue.trackInfo(guildID);
                const progress = await player.queue.progress(guildID);

                channel.send(`**${track.title}**\n${progress.bar} ${progress.percents}`);

                break;
            }

            case 'loop': {
                const loop = await player.queue.setLoop(guildID, args[0] === 'queue' ? Loop.QUEUE : Loop.TRACK);

                channel.send(`Loop track: ${loop.track}, loop queue: ${loop.queue}`);

                break;
            }

            case 'volume': await player.queue.setVolume(guildID, Number(args[0])); channel.send('Volume changed.'); break;
            case 'seek': await player.queue.seek(guildID, Number(args[0])); channel.send('Done.'); break;
            case 'shuffle': await player.queue.shuffle(guildID); channel.send('Shuffled.'); break;
            case 'filter': channel.send(`Filter: ${(await player.queue.setFilter(guildID, args[0] ?? 'clear')).name ?? 'none'}`); break;

            case 'providers': channel.send(player.sources.list.map((provider, index) => `${index + 1}. ${provider.name}`).join('\n')); break;

            case 'lyrics': {
                const lyrics = await player.lyrics(rest);

                // A message is limited to 2000 characters
                await channel.send(`**${lyrics.artist ?? ''} - ${lyrics.title ?? rest}**\n\n${lyrics.result}`.slice(0, 1990));

                break;
            }
        }
    }catch(error) {
        // Methods of the module reject with PlayerError, the code tells what went wrong
        if(error instanceof PlayerError) {
            if(error.code === PlayerErrorCode.QUEUE_NOT_FOUND) return void channel.send('Nothing is playing now!');

            return void channel.send(error.message);
        }

        console.error(error);
    }
});

client.login(process.env.DISCORD_TOKEN);
