/**
 * Downloads docs/index.json of every branch of the repository from GitHub into data/:
 * each branch that has the file becomes a version of the site (stable, dev...).
 * Branches without docs/index.json (website, void...) are skipped.
 *
 * Usage: tsx scripts/fetch-docs.ts
 *   GITHUB_TOKEN    optional, raises the GitHub API limit (the deploy workflow passes it)
 *   DOCS_SOURCE     `local` skips GitHub and shows a local docs/index.json as `local` (to preview docs you did not push yet)
 *   DOCS_LOCAL_PATH that local file (default: ../docs/index.json)
 *   DOCS_REPOSITORY another `owner/name` repository (default: xyligan-gp/discord-player-music)
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { localDocsPath, REPOSITORY, versionSlug, type VersionInfo } from '../src/lib/docs';

const DATA_DIR = join(process.cwd(), 'data');
const repository = process.env.DOCS_REPOSITORY || REPOSITORY;
const FALLBACK_BRANCHES = ['stable', 'dev'];

let useToken = Boolean(process.env.GITHUB_TOKEN);

function headers(): Record<string, string> {
	const token = useToken ? process.env.GITHUB_TOKEN : undefined;

	return {
		'User-Agent': 'dpm-website',
		Accept: 'application/vnd.github+json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

async function listBranches(): Promise<string[]> {
	const branches: string[] = [];

	for (let page = 1; ; page++) {
		const url = `https://api.github.com/repos/${repository}/branches?per_page=100&page=${page}`;
		let response = await fetch(url, { headers: headers() });

		// A wrong or expired GITHUB_TOKEN: a public repository works without it
		if (response.status === 401 && useToken) {
			useToken = false;
			response = await fetch(url, { headers: headers() });
		}

		if (!response.ok) throw new Error(`GitHub answered ${response.status} ${response.statusText} for the branches of ${repository}`);

		const list = (await response.json()) as { name: string }[];
		branches.push(...list.map((branch) => branch.name));

		if (list.length < 100) return branches;
	}
}

/** Date of the last commit that changed a file of a branch, or undefined when GitHub does not tell (rate limit, offline). */
async function lastChange(branch: string, path: string): Promise<string | undefined> {
	const url = `https://api.github.com/repos/${repository}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=1`;

	try {
		const response = await fetch(url, { headers: headers() });
		if (!response.ok) return undefined;

		const [commit] = (await response.json()) as { commit: { committer: { date: string } } }[];

		return commit?.commit.committer.date;
	} catch {
		return undefined;
	}
}

/** Dates of the last change of every guide of a branch, by slug. */
async function guideDates(branch: string, docs: string) {
	const custom = (JSON.parse(docs) as { custom?: Record<string, { files: Record<string, { path?: string }> }> }).custom ?? {};
	const guides = Object.values(custom).flatMap((category) => Object.entries(category.files));
	const dates: Record<string, string> = {};

	await Promise.all(
		guides.map(async ([slug, file]) => {
			const date = file.path ? await lastChange(branch, file.path) : undefined;
			if (date) dates[slug] = date;
		}),
	);

	return dates;
}

async function fetchDocs(branch: string): Promise<string | undefined> {
	const url = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch).replace(/%2F/g, '/')}/docs/index.json`;
	const response = await fetch(url, { headers: { 'User-Agent': 'dpm-website' } });

	if (response.status === 404) return undefined;
	if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);

	const text = await response.text();

	try {
		const json = JSON.parse(text) as { meta?: { format?: number } };
		if (!json.meta?.format) return undefined;
	} catch {
		return undefined;
	}

	return text;
}

export async function fetchAllDocs() {
	if (process.env.DOCS_SOURCE === 'local') {
		console.log(`[docs] DOCS_SOURCE=local: using ${localDocsPath()}`);
		rmSync(DATA_DIR, { recursive: true, force: true });
		return;
	}

	const started = performance.now();

	let branches: string[];
	try {
		branches = await listBranches();
	} catch (error) {
		// Offline or rate limited (60 requests an hour without a token): keep what was downloaded last time,
		// or at least try the main branches, raw.githubusercontent.com has no such limit
		const kept = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((file) => file.endsWith('.json') && file !== 'versions.json' && !file.endsWith('.dates.json')) : [];

		if (kept.length) {
			console.warn(`[docs] ${(error as Error).message}. Using the ${kept.length} versions downloaded before.`);
			return;
		}

		console.warn(`[docs] ${(error as Error).message}. Trying the ${FALLBACK_BRANCHES.join(' and ')} branches.`);
		branches = FALLBACK_BRANCHES;
	}

	const results = await Promise.all(branches.map(async (branch) => ({ branch, docs: await fetchDocs(branch).catch(() => undefined) })));
	const found = results.filter((result): result is { branch: string; docs: string } => Boolean(result.docs));

	if (!found.length) {
		console.warn(`[docs] No branch of ${repository} has docs/index.json, using the local docs`);
		return;
	}

	rmSync(DATA_DIR, { recursive: true, force: true });
	mkdirSync(DATA_DIR, { recursive: true });

	const versions: VersionInfo[] = [];

	for (const { branch, docs } of found) {
		const name = versionSlug(branch);
		writeFileSync(join(DATA_DIR, `${name}.json`), docs);
		writeFileSync(join(DATA_DIR, `${name}.dates.json`), JSON.stringify(await guideDates(branch, docs)));
		versions.push({ name, branch });
	}

	writeFileSync(join(DATA_DIR, 'versions.json'), JSON.stringify({ repository, versions }, null, '\t'));

	const skipped = results.filter((result) => !result.docs).map((result) => result.branch);
	console.log(
		`[docs] ${versions.map((version) => version.branch).join(', ')} from ${repository} in ${Math.round(performance.now() - started)} ms` +
			(skipped.length ? ` (no docs/index.json: ${skipped.join(', ')})` : ''),
	);
}

if (process.argv[1] && /fetch-docs\.ts$/.test(process.argv[1])) {
	fetchAllDocs().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
