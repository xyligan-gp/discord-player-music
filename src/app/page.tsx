import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { GitHubIcon } from '@/components/GitHubIcon';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { CodeExample } from '@/components/DocParts';
import { getDefaultVersion, REPOSITORY } from '@/lib/docs';

const FEATURES = [
	{ title: 'Simple', text: 'A promise based API that is easy to start with and friendly for beginners.' },
	{ title: 'Reliable sources', text: 'YouTube through youtubei.js with an automatic yt-dlp fallback, or your own provider.' },
	{ title: 'Full of features', text: 'Queues, loops, audio filters, lyrics, autoplay and progress bars for many servers at once.' },
	{ title: 'Typed', text: 'Written in TypeScript with typed errors and JSDoc for the whole API.' },
];

const EXAMPLE = `import { Client, GatewayIntentBits } from 'discord.js';
import { Player } from 'discord-player-music';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client);

player.on('playingTrack', track => track.channel.text.send(\`Now playing: **\${track.title}**\`));`;

export default function HomePage() {
	const version = getDefaultVersion();

	return (
		<div className="min-h-dvh bg-surface">
			<header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
				<Link className="text-xl font-bold" href="/">
					discord-player-music
				</Link>
				<div className="flex items-center gap-2">
					<Link className="rounded-md px-3 py-2 text-[15px] font-medium hover:bg-hover" href={`/docs/${version}/general/welcome/`}>
						Docs
					</Link>
					<a
						aria-label="GitHub"
						className="inline-flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
						href={`https://github.com/${REPOSITORY}`}
						rel="noopener noreferrer"
						target="_blank"
					>
						<GitHubIcon />
					</a>
					<ThemeSwitch />
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-6 pb-20">
				<section className="grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-24">
					<div>
						<h1 className="text-5xl leading-tight font-black tracking-tight sm:text-6xl">
							Music for your <span className="text-blurple">discord.js</span> bot
						</h1>
						<p className="mt-6 max-w-xl text-lg text-muted">
							discord-player-music is a powerful Node.js module that plays music in Discord voice channels: search, queues,
							filters, lyrics and more, in a few lines of code.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								className="inline-flex items-center gap-2 rounded-md bg-blurple px-5 py-3 font-semibold text-white transition-colors hover:bg-blurple/85"
								href={`/docs/${version}/general/welcome/`}
							>
								<BookOpen size={18} />
								Documentation
							</Link>
							<Link
								className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-3 font-semibold transition-colors hover:bg-hover"
								href={`/docs/${version}/class/Player/`}
							>
								Player API
								<ArrowRight size={18} />
							</Link>
						</div>
					</div>
					<div className="min-w-0">
						<CodeExample code="$ npm install discord-player-music discord.js" />
						<CodeExample code={EXAMPLE} />
					</div>
				</section>

				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map((feature) => (
						<div className="rounded-lg border border-line bg-sidebar/60 p-5 dark:bg-panel" key={feature.title}>
							<h2 className="font-semibold">{feature.title}</h2>
							<p className="mt-2 text-sm text-muted">{feature.text}</p>
						</div>
					))}
				</section>
			</main>
		</div>
	);
}
