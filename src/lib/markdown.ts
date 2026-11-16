import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { Element, Root } from 'hast';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { getGuides, getLinkTargets } from './docs';
import { codeKey, getPrerendered, markdownKey } from './prerendered';
import { EXTERNAL_TYPES, replaceJsdocLinks, rewriteHref } from './links';

export const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark-default' } as const;

const LANG_ALIAS: Record<string, string> = {
	'sh-session': 'shellsession',
	sh: 'bash',
	shell: 'bash',
	console: 'shellsession',
	dockerfile: 'docker',
};

let highlighter: Promise<HighlighterCore> | undefined;

/**
 * Only the languages and themes the docs use, loaded one by one: importing the full shiki bundle made
 * the dev server compile hundreds of grammars and slowed the first load of pages a lot.
 */
function getHighlighter() {
	highlighter ??= createHighlighterCore({
		themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark-default')],
		langs: [
			import('@shikijs/langs/javascript'),
			import('@shikijs/langs/typescript'),
			import('@shikijs/langs/json'),
			import('@shikijs/langs/yaml'),
			import('@shikijs/langs/shellsession'),
			import('@shikijs/langs/bash'),
			import('@shikijs/langs/diff'),
			import('@shikijs/langs/docker'),
		],
		engine: createJavaScriptRegexEngine(),
	});

	return highlighter;
}

/** Language of a code example: shell session when it has `$ ` prompts, JavaScript otherwise. */
export function exampleLanguage(code: string) {
	return /^\s*\$ /m.test(code) ? 'shellsession' : 'js';
}

/** Highlights a code example, from the prerendered cache when it is there. */
export async function highlight(code: string, lang = 'js') {
	return getPrerendered().code[codeKey(code, lang)] ?? highlightLive(code, lang);
}

export async function highlightLive(code: string, lang = 'js') {
	const instance = await getHighlighter();
	const language = LANG_ALIAS[lang] ?? lang;

	return instance.codeToHtml(normalizeNewlines(code).trim(), {
		lang: instance.getLoadedLanguages().includes(language) ? language : 'text',
		themes: SHIKI_THEMES,
		defaultColor: 'light',
	});
}

export function normalizeNewlines(text: string) {
	return text.replace(/\r\n?/g, '\n');
}

/** Rewrites links, opens external links in a new tab and gives headings an anchor link. */
function rehypeDocsLinks(options: { version: string; guideSlugs: Set<string> }) {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a' && typeof node.properties.href === 'string') {
				const href = rewriteHref(node.properties.href, options.version, options.guideSlugs);
				node.properties.href = href;

				if (/^https?:/.test(href)) {
					node.properties.target = '_blank';
					node.properties.rel = ['noopener', 'noreferrer'];
				}
			}

			if (/^h[2-4]$/.test(node.tagName) && typeof node.properties.id === 'string') {
				node.children = [
					{
						type: 'element',
						tagName: 'a',
						properties: { href: `#${node.properties.id}`, className: ['heading-anchor'] },
						children: node.children,
					},
				];
			}
		});
	};
}

/** Wraps tables in a block that scrolls sideways, so a wide table does not stretch the whole page on a phone. */
function rehypeScrollableTables() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (node.tagName !== 'table' || !parent || index === undefined) return;

			parent.children[index] = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-scroll'] },
				children: [node],
			};

			return 'skip';
		});
	};
}

function guideSlugs(version: string) {
	return new Set(getGuides(version).flatMap((category) => category.files.map((file) => file.slug)));
}

/** Link of a `{@link Target#member}` target. */
export function resolveTarget(version: string, target: string) {
	const [name = '', member] = target.split(/[#.]/);
	const page = getLinkTargets(version).get(name);

	if (page) return member ? `${page}#${member.replace(/^event:/, 'event-')}` : page;

	return EXTERNAL_TYPES[name] ?? (/^https?:/.test(target) ? target : undefined);
}

async function createProcessor(version: string) {
	// One processor and one highlighter for the whole build: creating them for every description made pages slow
	const instance = await getHighlighter();

	return unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSlug)
		.use(rehypeScrollableTables)
		.use(rehypeDocsLinks, { version, guideSlugs: guideSlugs(version) })
		.use(rehypeShikiFromHighlighter, instance as unknown as Parameters<typeof rehypeShikiFromHighlighter>[0], {
			themes: SHIKI_THEMES,
			defaultColor: 'light',
			langAlias: LANG_ALIAS,
			fallbackLanguage: 'text',
		})
		.use(rehypeStringify)
		.freeze();
}

const processors = new Map<string, ReturnType<typeof createProcessor>>();
const rendered = new Map<string, Promise<string>>();

/** Markdown to HTML, from the prerendered cache when it is there (see scripts/prerender.ts). */
export async function renderMarkdown(source: string, version: string) {
	return getPrerendered().markdown[markdownKey(source, version)] ?? renderMarkdownLive(source, version);
}

export function renderMarkdownLive(source: string, version: string) {
	const key = `${version}\0${source}`;
	let html = rendered.get(key);

	if (!html) {
		let processor = processors.get(version);
		if (!processor) {
			processor = createProcessor(version);
			processors.set(version, processor);
		}

		const text = replaceJsdocLinks(normalizeNewlines(source), (target) => resolveTarget(version, target));
		html = processor.then(async (instance) => String(await instance.process(text)));
		rendered.set(key, html);
	}

	return html;
}

/** Headings of a guide for the outline on the right. */
export function extractHeadings(html: string) {
	const headings: { id: string; text: string; level: number }[] = [];
	const regex = /<h([23]) id="([^"]+)"[^>]*>(.*?)<\/h\1>/gs;

	for (const match of html.matchAll(regex)) {
		headings.push({
			level: Number(match[1]),
			id: match[2]!,
			text: match[3]!
				.replace(/<[^>]+>/g, '')
				.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.trim(),
		});
	}

	return headings;
}
