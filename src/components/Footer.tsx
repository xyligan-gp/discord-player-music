import { DiscordIcon } from './DiscordIcon';

export function Footer() {
	return (
		<footer className="mx-auto mt-20 flex max-w-6xl flex-col gap-2 border-t border-line pt-6 pb-2 text-sm text-muted sm:flex-row sm:justify-between">
			<p className="flex items-center gap-2">
				<span>discord-player-music © {new Date().getFullYear()}</span>
				<span aria-hidden>·</span>
				<a className="inline-flex items-center gap-1.5 hover:text-accent hover:underline" href="https://discord.gg/zzbkvCcu2r" rel="noopener noreferrer" target="_blank">
					<DiscordIcon size={16} />
					Discord
				</a>
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
