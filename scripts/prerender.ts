/**
 * Renders every markdown text and code example of docs/index.json (all versions) once,
 * into .cache/prerendered.json. Pages then only read ready HTML.
 *
 * Usage: tsx scripts/prerender.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { clearDocsCache, getDocs, getGuides, getVersions } from '../src/lib/docs';
import { seeToMarkdown } from '../src/lib/links';
import { exampleLanguage, highlightLive, renderMarkdownLive } from '../src/lib/markdown';
import { codeKey, markdownKey, PRERENDERED_FILE, type Prerendered } from '../src/lib/prerendered';

export async function prerender() {
	const started = performance.now();
	clearDocsCache();
	const result: Prerendered = { markdown: {}, code: {} };
	const markdownJobs = new Map<string, { source: string; version: string }>();
	const codeJobs = new Map<string, { code: string; lang: string }>();

	const addMarkdown = (source: unknown, version: string) => {
		if (typeof source !== 'string' || !source) return;
		markdownJobs.set(markdownKey(source, version), { source, version });
	};

	const addCode = (code: string) => {
		const lang = exampleLanguage(code);
		codeJobs.set(codeKey(code, lang), { code, lang });
	};

	// Walks the whole docs tree, so new fields of docgen are picked up without changes here
	const walk = (node: unknown, version: string) => {
		if (Array.isArray(node)) {
			for (const item of node) walk(item, version);
			return;
		}

		if (!node || typeof node !== 'object') return;

		for (const [key, value] of Object.entries(node)) {
			if (key === 'description' || key === 'deprecated') addMarkdown(value, version);
			else if (key === 'examples' && Array.isArray(value)) value.forEach((example) => typeof example === 'string' && addCode(example));
			else if (key === 'see' && Array.isArray(value)) value.forEach((see) => typeof see === 'string' && addMarkdown(seeToMarkdown(see), version));
			else if (key !== 'custom' && key !== 'meta') walk(value, version);
		}
	};

	const versions = getVersions();

	for (const version of versions) {
		const docs = getDocs(version);
		walk([docs.classes, docs.interfaces, docs.typedefs], version);

		for (const category of getGuides(version)) {
			for (const file of category.files) addMarkdown(file.content, version);
		}
	}

	await Promise.all([
		...[...markdownJobs].map(async ([key, { source, version }]) => {
			result.markdown[key] = await renderMarkdownLive(source, version);
		}),
		...[...codeJobs].map(async ([key, { code, lang }]) => {
			result.code[key] = await highlightLive(code, lang);
		}),
	]);

	mkdirSync(dirname(PRERENDERED_FILE), { recursive: true });
	writeFileSync(PRERENDERED_FILE, JSON.stringify(result));

	console.log(
		`[prerender] ${markdownJobs.size} texts and ${codeJobs.size} code examples of ${versions.join(', ')} in ${Math.round(performance.now() - started)} ms`,
	);
}

// Run directly: `tsx scripts/prerender.ts`
if (process.argv[1] && /prerender\.ts$/.test(process.argv[1])) {
	prerender().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
