/**
 * `npm run dev`: downloads the docs of every branch from GitHub (scripts/fetch-docs.ts), prerenders them,
 * then starts `next dev`.
 *
 * `npm run dev:local` shows a local docs/index.json instead (docs you did not push yet) and prerenders it again
 * every time it changes, so `npm run build:docs` in the module folder shows up on the site right away.
 * The file is ../docs/index.json, or another one: `npm run dev:local -- --docs=C:/path/to/discord-player-music/docs/index.json`
 * (or the DOCS_LOCAL_PATH variable).
 */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname } from 'node:path';
import { fetchAllDocs } from './fetch-docs';
import { prerender } from './prerender';
import { localDocsPath } from '../src/lib/docs';

const args = process.argv.slice(2);
const docsArg = args.find((arg) => arg.startsWith('--docs='));
const local = args.includes('--local') || Boolean(docsArg);

if (local) process.env.DOCS_SOURCE = 'local';
if (docsArg) process.env.DOCS_LOCAL_PATH = docsArg.slice('--docs='.length);

await fetchAllDocs();
await prerender();

const next = spawn('npx', ['next', 'dev', ...args.filter((arg) => arg !== '--local' && !arg.startsWith('--docs='))], { stdio: 'inherit', shell: true });
next.on('exit', (code) => process.exit(code ?? 0));

if (local) {
	let timer: NodeJS.Timeout | undefined;

	watch(dirname(localDocsPath()), (_, file) => {
		if (!file?.toString().endsWith('.json')) return;

		clearTimeout(timer);
		timer = setTimeout(() => prerender().catch((error) => console.error('[prerender]', error)), 300);
	});
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.on(signal, () => {
		next.kill(signal);
		process.exit(0);
	});
}
