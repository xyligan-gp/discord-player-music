import { DiscordIcon } from './DiscordIcon';

const DISCORD_URL = 'https://discord.gg/zzbkvCcu2r';

export function Footer({ minimal = false }: { readonly minimal?: boolean }) {
	const year = new Date().getFullYear();
	const discord = (
		<a className="inline-flex items-center gap-1.5 hover:text-accent hover:underline" href={DISCORD_URL} rel="noopener noreferrer" target="_blank">
			<DiscordIcon size={16} />
			Discord
		</a>
	);

	if (minimal) {
		return (
			<footer className="mx-auto max-w-6xl border-t border-line px-6 py-6 text-sm text-muted">
				<p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
					<span>Developed with love ❤️</span>
					<span aria-hidden>·</span>
					<span>{year}</span>
					<span aria-hidden>·</span>
					{discord}
				</p>
			</footer>
		);
	}

	return (
		<footer className="mx-auto mt-20 flex max-w-6xl flex-col gap-2 border-t border-line pt-6 pb-2 text-sm text-muted sm:flex-row sm:justify-between">
			<p className="flex items-center gap-2">
				<span>discord-player-music © {year}</span>
				<span aria-hidden>·</span>
				{discord}
			</p>
			<p>
				Designed with love ❤️ based on{' '}
				<a className="hover:underline" href="https://github.com/discordjs/discord.js/tree/main/apps/website" rel="noopener noreferrer" target="_blank">
					discord.js.org
				</a>{' '}
				(Apache-2.0).
			</p>
		</footer>
	);
}
