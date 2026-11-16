import { REPOSITORY } from '@/lib/docs';

export function Footer() {
	return (
		<footer className="mx-auto mt-20 flex max-w-6xl flex-col gap-2 border-t border-line pt-6 pb-2 text-sm text-muted sm:flex-row sm:justify-between">
			<p>
				discord-player-music, MIT license.{' '}
				<a className="hover:underline" href={`https://github.com/${REPOSITORY}`} rel="noopener noreferrer" target="_blank">
					GitHub
				</a>
				{' · '}
				<a className="hover:underline" href="https://www.npmjs.com/package/discord-player-music" rel="noopener noreferrer" target="_blank">
					npm
				</a>
				{' · '}
				<a className="hover:underline" href="https://discord.gg/zzbkvCcu2r" rel="noopener noreferrer" target="_blank">
					Discord
				</a>
			</p>
			<p>
				Design based on{' '}
				<a className="hover:underline" href="https://github.com/discordjs/discord.js/tree/main/apps/website" rel="noopener noreferrer" target="_blank">
					discord.js.org
				</a>{' '}
				(Apache-2.0).
			</p>
		</footer>
	);
}
