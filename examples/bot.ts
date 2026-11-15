// A complete music bot for testing the whole module by hand (TypeScript). `!help` shows all the commands in an embed.
//
// 1. Install and build the module:            npm ci && npm run build
// 2. Create a `.env` file in the examples folder: DISCORD_TOKEN=your bot token
//    In the Discord developer portal enable "Message Content Intent" for the bot. The bot needs the permissions: Send Messages, Embed Links, Connect,
//    Speak, and for the reaction collector Add Reactions and Read Message History (the code asks for the GuildMessageReactions intent).
// 3. Run it:                                   node --env-file=examples/.env examples/bot.ts      (Node.js 22.18 or newer runs .ts files, or use `npx tsx`)
//
// In your own project install the module (`npm install discord-player-music discord.js`) and import it in the same way.
//
// What the bot shows:
// * playback: play, search, pick, pause, resume, toggle, stop, delete, skip, replay, seek, volume, loop, autoplay, shuffle, remove, clear
// * information (embeds): nowplaying, queue (pages with buttons), state, lyrics, stats, config
// * voice: join, leave
// * filters: filters, filter (set, add, remove, info)
// * sources: sources, ytdlp, prefetch, autoadd, utils
// * every event of the player is written to the console, and the main ones are also sent to the text channel (`!debug on` sends the technical ones too)
// * the "Now playing" message with a progress bar that moves (the `trackProgress` event): sent when a track starts, edited every PROGRESS_INTERVAL seconds, deleted when the next track starts
// * collectors: search, pick and the tests `!collector message|reaction`
import { existsSync } from 'node:fs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, ComponentType, EmbedBuilder, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import { Collector, GuildQueueState, Loop, Player, PlayerError, PlayerErrorCode, Search } from 'discord-player-music';
import type { PlayerTrack, YtDlpStatusEvent } from 'discord-player-music';

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
// `progressInterval` makes the player emit the `trackProgress` event every this many seconds while a track plays (the "Now playing" message is edited with it). It comes from PROGRESS_INTERVAL
// (seconds, 5 by default, 0 turns the event off).
const requestedInterval = Number(process.env.PROGRESS_INTERVAL ?? 5);
const progressInterval = !Number.isFinite(requestedInterval) || requestedInterval < 0 ? 5 : requestedInterval === 0 ? 0 : Math.max(3, requestedInterval);
const player = new Player(client, { cookies, sourceFailureThreshold: 3, progressInterval });

if(cookies) console.log(`Using the cookies from ${cookies}`);

// ---- Helpers ---------------------------------------------------------------------------------------------------------------------------------

const colors = { info: 0x5865f2, good: 0x57f287, warn: 0xfee75c, bad: 0xed4245 };

/**
 * Duration of a track as `mm:ss` (or `hh:mm:ss`), the player keeps it in the `duration` field of every track
 */
function trackTime(track: PlayerTrack): string {
    const { hours, minutes, seconds } = track.duration;

    return Number(hours) > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * One line about a track for an embed: a link, the duration and who requested it
 */
function trackLine(track: PlayerTrack, index?: number): string {
    const title = track.title.replace(/[[\]]/g, '');

    return `${index !== undefined ? `\`${index}.\` ` : ''}[${title}](${track.url}) \`${trackTime(track)}\` • ${track.requested}`;
}

/**
 * Embed that describes a track (the thumbnail and the author are optional: some sources do not give them)
 */
function trackEmbed(track: PlayerTrack, title: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(title)
        .setDescription(`[${track.title.replace(/[[\]]/g, '')}](${track.url})`)
        .addFields(
            { name: 'Duration', value: trackTime(track), inline: true },
            { name: 'Requested by', value: `${track.requested}`, inline: true },
            { name: 'Source', value: track.source ?? 'unknown', inline: true }
        );

    if(track.thumbnail) embed.setThumbnail(track.thumbnail);
    if(track.author.name) embed.setAuthor({ name: track.author.name, url: track.author.url || undefined });

    return embed;
}

/**
 * Reads a time like `90`, `1:30`, `1:02:03` or `1m30s` and returns seconds (`null` if the text is not a time)
 */
function parseTime(input: string | undefined): number | null {
    if(!input) return null;
    if(/^\d+(\.\d+)?$/.test(input)) return Number(input);

    const clock = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(input);
    if(clock) return Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);

    const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(input);
    if(units && (units[1] || units[2] || units[3])) return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);

    return null;
}

/**
 * Sends a message and ignores the errors (for example when the bot can not write to the channel any more)
 */
function say(channel: TextChannel | undefined, content: string | { embeds: Array<EmbedBuilder> }): void {
    channel?.send(content).catch(() => { });
}

// ---- The "Now playing" message (the trackProgress event) -------------------------------------------------------------------------------------
//
// When a track starts to play, the bot sends the "Now playing" message and keeps it up to date: the player emits `trackProgress` every `progressInterval` seconds
// (PROGRESS_INTERVAL in examples/.env, 5 by default, 3 at least; with 0 the event is off and the message stays as it was sent), and the bot edits the message.
// When the next track starts or the queue is closed, the old message is deleted. Discord limits how often a message can be edited, so use 5 seconds or more.

interface NowPlaying {
    message: Message | null;
    version: number;
}

const nowPlaying = new Map<string, NowPlaying>();

/**
 * Time as `m:ss` (or `h:mm:ss`)
 */
function clock(seconds: number): string {
    return player.utils.formatDuration(seconds).replace(/^00:/, '');
}

/**
 * Embed of the "Now playing" message: the track, the progress bar and `position / duration`
 */
function liveEmbed(track: PlayerTrack, position: number, duration: number, bar: string, percents: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(colors.good)
        .setTitle('Now playing')
        .setDescription(`[${track.title.replace(/[[\]]/g, '')}](${track.url})`)
        .addFields(
            { name: 'Progress', value: `${bar} ${percents}` },
            { name: 'Time', value: duration ? `${clock(position)} / ${clock(duration)}` : clock(position), inline: true },
            { name: 'Requested by', value: `${track.requested}`, inline: true }
        );

    if(track.thumbnail) embed.setThumbnail(track.thumbnail);
    if(track.author.name) embed.setAuthor({ name: track.author.name, url: track.author.url || undefined });

    return embed;
}

/**
 * A track starts to play: the "Now playing" message of the previous track is deleted and a new message is sent
 */
async function startNowPlaying(track: PlayerTrack): Promise<void> {
    const guildID = track.guild.id;
    const state = nowPlaying.get(guildID) ?? { message: null, version: 0 };

    nowPlaying.set(guildID, state);

    const version = ++state.version;
    const previous = state.message;

    state.message = null;

    await previous?.delete().catch(() => { });

    const duration = Number(track.duration.hours) * 3600 + Number(track.duration.minutes) * 60 + Number(track.duration.seconds);

    const sent = await track.channel.text.send({ embeds: [liveEmbed(track, 0, duration, player.utils.createEmptyProgress(), '0%')] }).catch(() => null);

    // Another track started while the message was sent: the newer message wins
    if(state.version !== version) return void sent?.delete().catch(() => { });

    state.message = sent;
}

/**
 * The queue was closed: the "Now playing" message is deleted and forgotten
 */
async function endNowPlaying(guildID: string): Promise<void> {
    const state = nowPlaying.get(guildID);
    const message = state?.message;

    if(!state || !message) return;

    state.version++;
    state.message = null;

    await message.delete().catch(() => { });
}

// ---- Events of the player --------------------------------------------------------------------------------------------------------------------
//
// Every event is written to the console. The main ones are also sent to the text channel. The technical ones (which source gives the audio, a failed
// source, the steps of yt-dlp) are sent only to the channels where `!debug on` was used.

// The text channels of `!debug on`, and the last yt-dlp status of every stage (`!ytdlp` shows them)
const debugChannels = new Map<string, TextChannel>();
const ytdlpStatus = new Map<string, YtDlpStatusEvent>();

function debug(text: string, channelID?: string): void {
    for(const [id, channel] of debugChannels) {
        if(!channelID || channelID === id) say(channel, `\`[debug]\` ${text}`.slice(0, 1990));
    }
}

player.on('ready', () => console.log(`[player] ready: version ${player.version} by ${player.author}, ${player.website}`));

player.on('queueStarted', queue => {
    console.log(`[queue] started in ${queue.channel.voice.guild.name}`);

    say(queue.channel.text, `Queue started in **${queue.channel.voice.name}**.`);
});

player.on('addedTrack', track => {
    console.log(`[queue] added "${track.title}"`);

    say(track.channel.text, `Added to the queue: **${track.title}** \`${trackTime(track)}\``);
});

player.on('playingTrack', track => {
    console.log(`[queue] playing "${track.title}"`);

    // The "Now playing" message (the old one is deleted)
    void startNowPlaying(track);
});

// The progress of the playing track (every progressInterval seconds, not while the queue is paused): the "Now playing" message is edited
player.on('trackProgress', (queue, data) => {
    const state = nowPlaying.get(data.track.guild.id);

    console.log(`[progress] ${data.track.title}: ${data.position}s / ${data.duration}s ${data.bar} ${data.percents}`);

    if(!state?.message) return;

    // A message that was deleted by a user is forgotten
    state.message.edit({ embeds: [liveEmbed(data.track, data.position, data.duration, data.bar, data.percents)] }).catch(() => { state.message = null });
});

player.on('queueStateChange', (queue, oldState, newState) => {
    console.log(`[queue] state ${oldState} -> ${newState}`);

    say(queue.channel.text, `Queue state: ${oldState} → **${newState}**`);
});

// The autoplay found related tracks and added them to the end of the queue (they play right after; `addedTrack` is not emitted for them)
player.on('autoplayAdded', (queue, tracks) => {
    console.log(`[autoplay] added ${tracks.length} track(s) in ${queue.channel.voice.guild.name}: ${tracks.map(track => track.title).join(' | ')}`);

    say(queue.channel.text, { embeds: [new EmbedBuilder().setColor(colors.good).setTitle('Autoplay: related tracks added').setDescription(tracks.map((track, index) => trackLine(track, index + 1)).join('\n'))] });
});

// A queue was closed. The event comes for every reason: 'ended' (the tracks are over), 'stopped' (queue.stop()), 'deleted' (queue.delete()),
// 'skipped' (the last track was skipped) or 'error' (the voice connection failed). In 1.x it came only when the tracks were over, so a handler that
// should keep that behaviour checks `reason === 'ended'`.
player.on('queueEnded', (queue, reason) => {
    console.log(`[queue] ended in ${queue.channel.voice.guild.name}: ${reason}`);

    say(queue.channel.text, reason === 'ended' ? 'The queue has ended.' : `The queue was closed: \`${reason}\``);

    // The "Now playing" message is deleted
    void endNowPlaying(queue.channel.voice.guild.id);
});

// A track that could not be played is skipped and the queue goes on with the next one
player.on('skippedTrack', ({ track, next, error }) => {
    console.warn(`[player] skipped "${track.title}": ${error.message}`);

    say(track.channel.text, `I can not play **${track.title}**, skipping it${next ? `. Next: **${next.title}**` : ''}\n\`${error.message.slice(0, 300)}\``);
});

player.on('error', ({ channel, method, error }) => {
    console.error(`[${method}]`, error);

    say(channel?.text, { embeds: [new EmbedBuilder().setColor(colors.bad).setTitle('Player error').setDescription(`\`${method}\`: ${error.message}`.slice(0, 4000))] });
});

// Shows which source provider failed and that the next one is used
player.on('providerFailed', ({ provider, method, error }) => {
    console.warn(`[sources] ${provider} failed to ${method}: ${error.message}`);

    debug(`${provider} failed to ${method}: ${error.message}`);
});

// Every step of finding, checking, downloading and updating yt-dlp (it starts when the player is created)
player.on('ytdlpStatus', event => {
    const { stage, message, version, latest } = event;

    console.log(`[yt-dlp] ${stage}${version ? ` (version ${version}${latest ? `, latest ${latest}` : ''})` : ''}: ${message}`);

    ytdlpStatus.set(stage, event);
    debug(`yt-dlp ${stage}: ${message}`);
});

// Which source gives the audio of a track (and whether it was prepared in advance), useful for debugging. `via` is set when a provider plays the audio
// of another one.
player.on('sourceUsed', ({ provider, via, track, seek, prefetched }) => {
    const text = `${provider}${via ? ` (audio from ${via})` : ''} plays "${track.title}"${seek ? ` from ${seek}s` : ''}${prefetched ? ' (prepared in advance)' : ''}`;

    console.log(`[sources] ${text}`);

    debug(text, track.channel.text.id);
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

// ---- Commands --------------------------------------------------------------------------------------------------------------------------------

interface Context {
    message: Message<true>;
    channel: TextChannel;
    guildID: string;
    args: Array<string>;
    rest: string;
}

interface Command {
    category: string;
    usage: string;
    description: string;
    aliases?: Array<string>;
    run(context: Context): unknown;
}

const QUEUE_PAGE_SIZE = 10;

/**
 * Embed with one page of the queue: the playing track and the next ones (the numbers are the indexes for `!remove`)
 */
function queuePage(tracks: Array<PlayerTrack>, page: number): { embed: EmbedBuilder, row: ActionRowBuilder<ButtonBuilder>, page: number } {
    const upcoming = tracks.slice(1);
    const pages = Math.max(1, Math.ceil(upcoming.length / QUEUE_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pages);
    const start = (current - 1) * QUEUE_PAGE_SIZE;
    const lines = upcoming.slice(start, start + QUEUE_PAGE_SIZE).map((track, index) => trackLine(track, start + index + 1));

    const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle('Queue')
        .setDescription(`**Now:** ${trackLine(tracks[0])}\n\n${lines.join('\n') || 'No more tracks.'}`)
        .setFooter({ text: `Page ${current}/${pages} • ${tracks.length} track(s)` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`queue:${current - 1}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(current <= 1),
        new ButtonBuilder().setCustomId(`queue:${current + 1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(current >= pages)
    );

    return { embed, row, page: current };
}

/**
 * Sends the embed of the queue with the buttons that switch the pages (the buttons work for the author of the command for one minute)
 */
async function showQueue({ message, channel, guildID, args }: Context): Promise<void> {
    const { tracks } = await player.queue.get(guildID);
    const first = queuePage(tracks, Number(args[0]) || 1);
    const sent = await channel.send({ embeds: [first.embed], components: [first.row] });

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000, filter: click => click.user.id === message.author.id });

    collector.on('collect', async click => {
        // The queue may have changed since the command: it is read again
        const current = await player.queue.get(guildID).then(queue => queue.tracks, () => null);

        if(!current) return void click.update({ content: 'The queue is closed.', embeds: [], components: [] });

        const next = queuePage(current, Number(click.customId.split(':')[1]));

        await click.update({ embeds: [next.embed], components: [next.row] });
    });

    collector.on('end', () => { sent.edit({ components: [] }).catch(() => { }) });
}

/**
 * Embed of the playing track: the progress bar (see `progressConfig`), the loop, the volume, the filter and the state of the queue
 */
async function showNowPlaying({ channel, guildID }: Context): Promise<void> {
    const track = await player.queue.trackInfo(guildID);
    const progress = await player.queue.progress(guildID);
    const info = await player.queue.streamInfo(guildID);
    const { streamTime: time } = info;

    const embed = trackEmbed(track, 'Now playing').addFields(
        { name: 'Progress', value: `${progress.bar} ${progress.percents}` },
        { name: 'State', value: info.state, inline: true },
        { name: 'Volume', value: `${info.volume} (default ${player.options.defaultVolume})`, inline: true },
        { name: 'Filter', value: info.filter.name ?? 'none', inline: true },
        { name: 'Loop', value: `track: ${info.loop.track}, queue: ${info.loop.queue}`, inline: true },
        { name: 'Autoplay', value: `${info.autoplay}`, inline: true },
        { name: 'Queue is playing for', value: `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`, inline: true }
    );

    await channel.send({ embeds: [embed] });
}

/**
 * Sends a long text as an embed (a description of an embed is limited to 4096 characters)
 */
function textEmbed(title: string, text: string, color: number = colors.info): { embeds: Array<EmbedBuilder> } {
    return { embeds: [new EmbedBuilder().setColor(color).setTitle(title).setDescription(text.slice(0, 4000))] };
}

const commands: Record<string, Command> = {
    // ---- playback ----
    play: {
        category: 'Playback', usage: 'play <title|video link|playlist link>', description: 'Adds a track to the queue: a title takes the first result, a link is added by itself, a playlist link adds all its tracks (up to `playlistLimit`)',
        async run({ message, channel, rest }) {
            if(!message.member?.voice.channel) return void channel.send('Join a voice channel first!');
            if(!rest) return void channel.send('Enter a title or a link!');

            const results = await player.search(rest, message.member, channel);

            if(results[0].searchType === Search.TITLE) {
                // A title gives a list of results: the first one is taken (see `!search` and `!pick` to choose)
                await player.initQueueTrack(1, results);
            }else if(!player.options.autoAddingTracks) {
                // With `!autoadd off` the links are not added by the player: they are added here
                for(const track of results) await player.queue.add(track);
            }

            if(results[0].searchType === Search.PLAYLIST) {
                await channel.send(textEmbed('Playlist added', `${results.length} track(s):\n${results.slice(0, 10).map((track, index) => trackLine(track, index + 1)).join('\n')}${results.length > 10 ? `\n...and ${results.length - 10} more` : ''}`, colors.good));
            }
        }
    },

    search: { category: 'Playback', usage: 'search <title>', description: 'Shows a list of results, you choose by writing a number (message collector, `cancel` cancels)', run: ({ message, rest }) => choose('message', message, rest) },
    pick: { category: 'Playback', usage: 'pick <title>', description: 'The same with number reactions (reaction collector, the cross cancels)', run: ({ message, rest }) => choose('reaction', message, rest) },

    pause: { category: 'Playback', usage: 'pause', description: 'Pauses (an already paused queue gives INVALID_STATE)', async run({ channel, guildID }) { await player.queue.setState(guildID, GuildQueueState.PAUSED); channel.send('Paused.') } },
    resume: { category: 'Playback', usage: 'resume', description: 'Resumes (a queue that is not paused gives INVALID_STATE)', async run({ channel, guildID }) { await player.queue.setState(guildID, GuildQueueState.PLAYING); channel.send('Resumed.') } },
    toggle: { category: 'Playback', usage: 'toggle', description: 'setState() without a state: a paused queue is resumed, a playing one is not changed', async run({ channel, guildID }) { const { status } = await player.queue.setState(guildID); channel.send(status ? 'The state was changed.' : 'The state was not changed (the queue is playing).') } },

    skip: {
        category: 'Playback', usage: 'skip', description: 'Skips the current track',
        async run({ channel, guildID }) {
            const { current, next } = await player.queue.skipTrack(guildID);

            channel.send(`Skipped **${current.title}**${next ? `, next: **${next.title}**` : ' (it was the last track)'}`);
        }
    },

    replay: {
        category: 'Playback', usage: 'replay', description: 'Plays the current track from the beginning again (initGuildTrack)',
        async run({ guildID }) {
            const { tracks } = await player.queue.get(guildID);

            await player.initGuildTrack(guildID, tracks[0]);
        }
    },

    stop: { category: 'Playback', usage: 'stop', description: 'Stops the playback, the bot leaves the voice channel and the queue is deleted', async run({ channel, guildID }) { await player.queue.stop(guildID); channel.send('Stopped.') } },
    delete: { category: 'Playback', usage: 'delete', description: 'Deletes the queue but the bot stays in the voice channel', async run({ channel, guildID }) { await player.queue.delete(guildID); channel.send('The queue was deleted.') } },

    seek: {
        category: 'Playback', usage: 'seek <time>', description: 'Rewinds the track: seconds (`90`), `1:30`, `1:02:03` or `1m30s`',
        async run({ channel, guildID, args }) {
            const seconds = parseTime(args[0]);
            if(seconds === null) return void channel.send('Enter a time: `90`, `1:30` or `1m30s`.');

            await player.queue.seek(guildID, seconds);

            channel.send(`Rewound to ${seconds}s.`);
        }
    },

    volume: {
        category: 'Playback', usage: 'volume [number]', description: 'Shows or sets the volume. The module scale is used: the default volume (`defaultVolume`, 5) is the normal loudness, 0 is silence',
        async run({ channel, guildID, args }) {
            if(args[0] === undefined) {
                const { volume } = await player.queue.streamInfo(guildID);

                return void channel.send(`Volume: **${volume}** (default ${player.options.defaultVolume}, ${Math.round(volume / player.options.defaultVolume * 100)}% of it)`);
            }

            const value = Number(args[0]);
            if(!Number.isFinite(value) || value < 0 || value > 100) return void channel.send('Enter a number from 0 to 100.');

            await player.queue.setVolume(guildID, value);

            channel.send(`Volume changed to **${value}**.`);
        }
    },

    loop: {
        category: 'Playback', usage: 'loop [track|queue|off|status]', description: 'Switches the loop of the track (default) or the queue; `off` turns both off. With `synchronLoop` only one mode is active',
        async run({ channel, guildID, args }) {
            const { loop } = await player.queue.get(guildID);

            if(args[0] === 'status') return void channel.send(`Loop track: ${loop.track}, loop queue: ${loop.queue}`);

            if(args[0] === 'off') {
                if(loop.track) await player.queue.setLoop(guildID, Loop.TRACK);
                if(loop.queue) await player.queue.setLoop(guildID, Loop.QUEUE);
            }else await player.queue.setLoop(guildID, args[0] === 'queue' ? Loop.QUEUE : Loop.TRACK);

            const changed = (await player.queue.get(guildID)).loop;

            channel.send(`Loop track: **${changed.track}**, loop queue: **${changed.queue}**`);
        }
    },

    autoplay: {
        category: 'Playback', usage: 'autoplay [on|off]', description: 'Turns the autoplay of this queue on or off (no argument: switches it). When the tracks are over and no loop is on, the module finds related tracks, adds them and goes on playing, until it is turned off',
        async run({ channel, guildID, args }) {
            const { autoplay } = await player.queue.setAutoplay(guildID, args[0] === 'on' ? true : args[0] === 'off' ? false : undefined);

            channel.send(`Autoplay: **${autoplay}**${autoplay ? ' (it does not work while the loop of the track or the queue is on)' : ''}`);
        }
    },

    shuffle: {
        category: 'Playback', usage: 'shuffle', description: 'Shuffles the queue (the playing track stays, at least 3 tracks are needed)',
        async run({ channel, guildID }) {
            const tracks = await player.queue.shuffle(guildID);

            await channel.send(textEmbed('Shuffled', tracks.slice(0, 10).map((track, index) => trackLine(track, index)).join('\n')));
        }
    },

    remove: {
        category: 'Playback', usage: 'remove <index>', description: 'Removes the track with the index from `!queue` (0 is the playing track: it is skipped)',
        async run({ channel, guildID, args }) {
            const index = Number(args[0]);
            if(!Number.isInteger(index) || index < 0) return void channel.send('Enter the index of the track from `!queue`.');

            const { deleted } = await player.queue.removeTrack(guildID, index);

            channel.send(`Removed **${deleted.title}**.`);
        }
    },

    clear: {
        category: 'Playback', usage: 'clear', description: 'Removes all the tracks except the playing one (the module has no such method: it is made with removeTrack)',
        async run({ channel, guildID }) {
            const { tracks } = await player.queue.get(guildID);

            for(let index = tracks.length - 1; index > 0; index--) await player.queue.removeTrack(guildID, index);

            channel.send(`Removed ${Math.max(tracks.length - 1, 0)} track(s).`);
        }
    },

    // ---- information ----
    nowplaying: { category: 'Information', usage: 'nowplaying', aliases: ['now', 'np'], description: 'Embed with the playing track, the progress bar, the volume, the filter and the loop', run: showNowPlaying },
    queue: { category: 'Information', usage: 'queue [page]', aliases: ['q'], description: 'Embed with the queue, the pages are switched with buttons', run: showQueue },

    state: {
        category: 'Information', usage: 'state', description: 'The queue of the server as the module keeps it (queue.get) and the number of active queues',
        async run({ channel, guildID }) {
            const queue = await player.queue.get(guildID);

            await channel.send(textEmbed('Queue state', [
                `State: **${queue.state}**`,
                `Tracks: **${queue.tracks.length}**`,
                `Volume: **${queue.volume}**`,
                `Filter: **${queue.filter.name ?? 'none'}**`,
                `Loop: track **${queue.loop.track}**, queue **${queue.loop.queue}**`,
                `Autoplay: **${queue.autoplay}**`,
                `Voice channel: **${queue.channel.voice.name}**, text channel: ${queue.channel.text}`,
                `Started: <t:${Math.round(queue.startStream / 1000)}:R>`,
                `Active queues of the player: **${player.queue.size}**`
            ].join('\n')));
        }
    },

    lyrics: {
        category: 'Information', usage: 'lyrics [artist - title]', description: 'Lyrics of the given song, or of the playing track (LRCLIB)',
        async run({ channel, guildID, rest }) {
            const query = rest || (await player.queue.trackInfo(guildID)).title;
            const lyrics = await player.lyrics(query);

            await channel.send(textEmbed(`${lyrics.artist ?? ''} - ${lyrics.title ?? query}`.trim(), lyrics.result));
        }
    },

    stats: {
        category: 'Information', usage: 'stats', aliases: ['info'], description: 'Version of the module, uptime, active queues and the memory of the process',
        run({ channel }) {
            const memory = process.memoryUsage();
            const mb = (value: number) => `${Math.round(value / 1024 / 1024)} MB`;

            return channel.send({ embeds: [new EmbedBuilder().setColor(colors.info).setTitle('Player').addFields(
                { name: 'Module', value: `${player.version} by ${player.author}\n${player.website}`, inline: true },
                { name: 'Ready', value: `${player.isReady}${player.readyAt ? ` (<t:${Math.round(player.readyAt / 1000)}:R>)` : ''}`, inline: true },
                { name: 'Active queues', value: `${player.queue.size}`, inline: true },
                { name: 'Process memory', value: `rss ${mb(memory.rss)}, heap ${mb(memory.heapUsed)} / ${mb(memory.heapTotal)}`, inline: true },
                { name: 'Uptime', value: `${player.utils.formatDuration(Math.round(process.uptime()))}`, inline: true },
                { name: 'Node.js', value: process.version, inline: true }
            )] });
        }
    },

    config: {
        category: 'Information', usage: 'config', description: 'The options of the player after the check (`utils.checkOptions`), the cookies are not shown',
        run({ channel }) {
            const { options } = player;
            const text = JSON.stringify({
                autoAddingTracks: options.autoAddingTracks, autoplay: options.autoplay, autoplayLimit: options.autoplayLimit, autoplayHistory: options.autoplayHistory, autoplayMaxDuration: options.autoplayMaxDuration, progressInterval: options.progressInterval, searchResultsLimit: options.searchResultsLimit, synchronLoop: options.synchronLoop, defaultVolume: options.defaultVolume,
                playlistLimit: options.playlistLimit, prefetchSeconds: options.prefetchSeconds, sourceFailureThreshold: options.sourceFailureThreshold, sourceCooldown: options.sourceCooldown,
                cookies: options.cookies ? 'set' : 'not set', progressConfig: options.progressConfig, collectorsConfig: options.collectorsConfig
            }, null, 2);

            return channel.send(`\`\`\`json\n${text.slice(0, 1900)}\n\`\`\``);
        }
    },

    // ---- voice ----
    join: {
        category: 'Voice', usage: 'join', description: 'The bot joins your voice channel (player.voice.join)',
        async run({ message, channel }) {
            const voice = message.member?.voice.channel;
            if(!voice) return void channel.send('Join a voice channel first!');

            await player.voice.join(voice);

            channel.send(`Joined **${voice.name}**.`);
        }
    },

    leave: {
        category: 'Voice', usage: 'leave', description: 'The bot leaves the voice channel (player.voice.leave)',
        async run({ channel, guildID }) {
            await player.voice.leave(guildID);

            channel.send(`Left the voice channel. Active queues of the player: ${player.queue.size}.`);
        }
    },

    // ---- filters ----
    filters: {
        category: 'Filters', usage: 'filters', description: 'Lists the registered filters (the built-in ones and yours) and shows the filter of the queue',
        async run({ channel, guildID }) {
            const list = await player.filters.list();
            const current = await player.queue.streamInfo(guildID).then(info => info.filter.name ?? 'none', () => 'no queue');

            await channel.send(textEmbed('Filters', `Current: **${current}**\n\n${[...list.keys()].map(name => `\`${name}\``).join(', ')}`));
        }
    },

    filter: {
        category: 'Filters', usage: 'filter <name|clear>', description: '`!filter <name>` turns a filter on (`clear` turns it off), `!filter add <name> <ffmpeg filter>` registers your own, `!filter remove <name>` deletes it, `!filter info <name>` shows it',
        async run({ channel, guildID, args }) {
            const [action, name, ...value] = args;

            if(action === 'add') {
                if(!name || !value.length) return void channel.send('Usage: `!filter add <name> <ffmpeg audio filter>`, for example `!filter add quiet volume=0.5`');

                await player.filters.add(name, value.join(' '));

                return void channel.send(`Filter **${name}** was registered.`);
            }

            if(action === 'remove') {
                await player.filters.delete(name ?? '');

                return void channel.send(`Filter **${name}** was deleted.`);
            }

            if(action === 'info') {
                if(!await player.filters.isExists(name ?? '')) return void channel.send(`There is no filter **${name}**.`);

                const filter = await player.filters.get(name);

                return void channel.send(`**${filter.name}**: \`${filter.value}\``);
            }

            const filter = await player.queue.setFilter(guildID, action ?? 'clear');

            channel.send(`Filter: **${filter.name ?? 'none'}** (the track continues from the same position)`);
        }
    },

    // ---- sources and settings ----
    sources: {
        category: 'Sources', usage: 'sources [link]', aliases: ['providers'], description: 'The source providers in order of priority; with a link it shows which of them handle it. The failure counters of the registry are internal and are not shown (see `!debug on` for failures)',
        run({ channel, rest }) {
            const lines = player.sources.list.map((provider, index) => {
                const abilities = [provider.isPlaylist ? 'playlists' : null, provider.prepare ? 'prepare' : null, provider.attach ? 'attach' : null, provider.audioProvider ? 'audioProvider' : null].filter(Boolean).join(', ');
                const handles = rest ? ` — handles the link: **${provider.canHandle(rest)}**${provider.isPlaylist?.(rest) ? ', a playlist link' : ''}` : '';

                return `${index + 1}. **${provider.name}** (${abilities || 'basic'})${handles}`;
            });

            return channel.send(textEmbed('Source providers', `${lines.join('\n')}\n\nIs a playlist link: **${rest ? player.sources.isPlaylist(rest) : '-'}**\nSource failure threshold: ${player.options.sourceFailureThreshold}, cooldown: ${player.options.sourceCooldown}`));
        }
    },

    ytdlp: {
        category: 'Sources', usage: 'ytdlp', description: 'The last known step of finding, checking, downloading and updating yt-dlp (the `ytdlpStatus` event); the module updates the downloaded yt-dlp when the player starts',
        run({ channel }) {
            if(!ytdlpStatus.size) return channel.send('No yt-dlp events yet (yt-dlp is not used, or the bot was started without it).');

            return channel.send(textEmbed('yt-dlp', [...ytdlpStatus.values()].map(event => `**${event.stage}** (${event.origin}${event.version ? `, ${event.version}` : ''}${event.latest ? `, latest ${event.latest}` : ''}): ${event.message}`).join('\n')));
        }
    },

    prefetch: {
        category: 'Sources', usage: 'prefetch [seconds]', description: 'Shows or changes `prefetchSeconds` (the next track is prepared this many seconds before the current one ends, 0 turns it off). It works from the next track',
        run({ channel, args }) {
            if(args[0] !== undefined) {
                const seconds = Number(args[0]);
                if(!Number.isFinite(seconds) || seconds < 0) return channel.send('Enter a number of seconds (0 turns it off).');

                // The options of the player are an ordinary object that the player reads every time
                player.options.prefetchSeconds = seconds;
            }

            return channel.send(`prefetchSeconds: **${player.options.prefetchSeconds}**`);
        }
    },

    autoadd: {
        category: 'Sources', usage: 'autoadd [on|off]', description: 'Shows or switches `autoAddingTracks`: whether `player.search` adds a found link to the queue by itself (`!play` works in both modes)',
        run({ channel, args }) {
            if(args[0] === 'on' || args[0] === 'off') player.options.autoAddingTracks = args[0] === 'on';

            return channel.send(`autoAddingTracks: **${player.options.autoAddingTracks}**`);
        }
    },

    utils: {
        category: 'Sources', usage: 'utils [warn]', description: 'Examples of `player.utils`; `!utils warn` passes a wrong option to `checkOptions`: the console shows the warning and the default value is used',
        run({ channel, args }) {
            if(args[0] === 'warn') {
                const options = player.utils.checkOptions({ defaultVolume: 'loud' as never, collectorsConfig: { message: { time: 60000 as never } } });

                return channel.send(`checkOptions used defaultVolume **${options.defaultVolume}** and message time **${options.collectorsConfig.message.time}**. Look at the console: it has the warnings.`);
            }

            return channel.send([
                `formatDuration(307) = \`${player.utils.formatDuration(307)}\``,
                `formatnumbers([1, 2, 10]) = \`${player.utils.formatnumbers([1, 2, 10]).join(', ')}\``,
                `createEmptyProgress() = ${player.utils.createEmptyProgress()}`
            ].join('\n'));
        }
    },

    debug: {
        category: 'Sources', usage: 'debug [on|off]', description: 'Sends the technical events (which source plays, failed sources, yt-dlp steps) to this channel too',
        run({ channel, args }) {
            if(args[0] === 'on') debugChannels.set(channel.id, channel);
            if(args[0] === 'off') debugChannels.delete(channel.id);

            return channel.send(`Debug messages in this channel: **${debugChannels.has(channel.id)}**`);
        }
    },

    // ---- tests of the collectors ----
    collector: {
        category: 'Collectors', usage: 'collector <message|reaction> [tracks]', description: 'Runs a collector on fake tracks with 3 attempts and 30 seconds: try a wrong answer, waiting for the end, cancelling',
        run: ({ message, args }) => testCollector(args[0], Number(args[1]) || 5, message)
    },

    help: {
        category: 'Information', usage: 'help', description: 'This list',
        run({ channel }) {
            const embed = new EmbedBuilder().setColor(colors.info).setTitle('Commands').setFooter({ text: `Prefix: ${prefix}` });
            const categories = new Map<string, Array<string>>();

            for(const command of Object.values(commands)) {
                const lines = categories.get(command.category) ?? [];

                lines.push(`\`${prefix}${command.usage}\` ${command.description}`);
                categories.set(command.category, lines);
            }

            // A field of an embed is limited to 1024 characters, so a long category is split into several fields
            for(const [category, lines] of categories) {
                let chunk = '';
                let part = 0;

                for(const line of lines) {
                    if(chunk && chunk.length + line.length > 1000) {
                        embed.addFields({ name: part++ ? `${category} (cont.)` : category, value: chunk });

                        chunk = '';
                    }

                    chunk += `${chunk ? '\n' : ''}${line}`;
                }

                if(chunk) embed.addFields({ name: part ? `${category} (cont.)` : category, value: chunk });
            }

            return channel.send({ embeds: [embed] });
        }
    }
};

// Commands by name and by alias
const byName = new Map<string, Command>();

for(const [name, command] of Object.entries(commands)) {
    byName.set(name, command);

    for(const alias of command.aliases ?? []) byName.set(alias, command);
}

client.on('messageCreate', async (message: Message) => {
    if(message.author.bot || !message.inGuild() || !message.content.startsWith(prefix)) return;

    const [name, ...args] = message.content.slice(prefix.length).split(/\s+/);
    const command = byName.get(name.toLowerCase());
    const channel = message.channel as TextChannel;

    if(!command) return;

    try {
        await command.run({ message, channel, guildID: message.guild.id, args, rest: args.join(' ') });
    }catch(error) {
        // Methods of the module reject with PlayerError: the code tells what went wrong, and `error.status` is a number like in HTTP
        if(error instanceof PlayerError) {
            console.warn(`[command] ${name}: ${error.code} (${error.status}): ${error.message}`);

            const text = error.code === PlayerErrorCode.QUEUE_NOT_FOUND ? 'Nothing is playing now!' : error.message;

            return void channel.send({ embeds: [new EmbedBuilder().setColor(colors.bad).setTitle(error.code).setDescription(text.slice(0, 4000)).setFooter({ text: `status ${error.status}` })] }).catch(() => { });
        }

        console.error(`[command] ${name}`, error);

        channel.send(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`).catch(() => { });
    }
});

client.login(process.env.DISCORD_TOKEN);
