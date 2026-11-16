import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * HTML of every markdown text and code example of the docs, made once by `scripts/prerender.ts`
 * (it runs before `npm run dev` and `npm run build`), so pages do not run markdown and shiki on every request.
 * A text that is not in the cache (it changed after the cache was made) is rendered on the fly.
 */
export interface Prerendered {
	markdown: Record<string, string>;
	code: Record<string, string>;
}

export const PRERENDERED_FILE = join(process.cwd(), '.cache', 'prerendered.json');

const EMPTY: Prerendered = { markdown: {}, code: {} };

let cached: { data: Prerendered; mtime: number } | undefined;

function hash(...parts: string[]) {
	return createHash('sha1').update(parts.join('\0')).digest('base64url');
}

export function markdownKey(source: string, version: string) {
	return hash('md', version, source);
}

export function codeKey(code: string, lang: string) {
	return hash('code', lang, code);
}

export function getPrerendered(): Prerendered {
	if (!existsSync(PRERENDERED_FILE)) return EMPTY;

	// Read again when the dev script made a new cache after a change of docs/index.json
	const mtime = statSync(PRERENDERED_FILE).mtimeMs;

	if (cached?.mtime !== mtime) {
		try {
			cached = { data: JSON.parse(readFileSync(PRERENDERED_FILE, 'utf8')) as Prerendered, mtime };
		} catch {
			return cached?.data ?? EMPTY;
		}
	}

	return cached.data;
}
