import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Types of the docs/index.json file that `npm run build:docs` (@distube/docgen, format 22) writes.
 */

/** A type is a union of members, a member is a list of [name, punctuation after it] tokens. */
export type DocType = [string, string?][][];

export interface DocMeta {
	line: number;
	file: string;
	path: string;
}

export interface DocParam {
	name: string;
	description?: string;
	optional?: boolean;
	default?: unknown;
	variable?: boolean;
	nullable?: boolean;
	type?: DocType;
}

export interface DocReturns {
	types?: DocType;
	description?: string;
}

export interface DocProp extends DocParam {
	access?: 'private' | 'protected';
	scope?: 'static';
	readonly?: boolean;
	abstract?: boolean;
	deprecated?: string | boolean;
	props?: DocParam[];
	examples?: string[];
	see?: string[];
	meta?: DocMeta;
}

export interface DocMethod {
	name: string;
	description?: string;
	access?: 'private' | 'protected';
	scope?: 'static';
	async?: boolean;
	generator?: boolean;
	abstract?: boolean;
	deprecated?: string | boolean;
	inherits?: string;
	inherited?: boolean;
	implements?: string[];
	examples?: string[];
	see?: string[];
	emits?: string[];
	throws?: DocType;
	params?: DocParam[];
	returns?: DocReturns | DocType;
	meta?: DocMeta;
}

export interface DocEvent {
	name: string;
	description?: string;
	deprecated?: string | boolean;
	params?: DocParam[];
	examples?: string[];
	see?: string[];
	meta?: DocMeta;
}

export interface DocClass {
	name: string;
	description?: string;
	extends?: DocType;
	implements?: DocType;
	access?: 'private';
	abstract?: boolean;
	deprecated?: string | boolean;
	see?: string[];
	examples?: string[];
	construct?: { name: string; description?: string; params?: DocParam[]; examples?: string[] };
	props?: DocProp[];
	methods?: DocMethod[];
	events?: DocEvent[];
	meta?: DocMeta;
}

export interface DocTypedef {
	name: string;
	description?: string;
	access?: 'private';
	deprecated?: string | boolean;
	see?: string[];
	examples?: string[];
	type?: DocType;
	props?: DocProp[];
	params?: DocParam[];
	returns?: DocReturns | DocType;
	meta?: DocMeta;
}

export interface DocCustomFile {
	name: string;
	type: string;
	content: string;
	path?: string;
}

export interface DocsData {
	meta: { generator: string; format: number; date: number };
	custom: Record<string, { name: string; files: Record<string, DocCustomFile> }>;
	classes: DocClass[];
	interfaces: DocClass[];
	typedefs: DocTypedef[];
	externals: { name: string; see?: string[] }[];
}

export type ItemKind = 'class' | 'typedef' | 'enum' | 'guide';

export interface NavItem {
	name: string;
	href: string;
	kind: ItemKind;
}

export interface NavSection {
	title: string;
	items: NavItem[];
}

export interface SearchItem {
	name: string;
	href: string;
	kind: ItemKind | 'method' | 'property' | 'event';
	parent?: string;
}

export const REPOSITORY = 'xyligan-gp/discord-player-music';
export const PACKAGE_NAME = 'discord-player-music';

/** Order of the known versions in the version select, the others come after them by name. */
const KNOWN_VERSIONS = ['stable', 'dev'];

/** Name of the version made from ../docs/index.json when there are no downloaded versions. */
export const LOCAL_VERSION = 'local';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const MANIFEST = join(DATA_DIR, 'versions.json');
/** docs/index.json for `npm run dev:local`: DOCS_LOCAL_PATH, or ../docs/index.json next to the site folder. */
export function localDocsPath() {
	return resolve(ROOT, process.env.DOCS_LOCAL_PATH || join('..', 'docs', 'index.json'));
}

const cache = new Map<string, { data: DocsData; mtime: number }>();

/** Modification time of a file, 0 when it is missing. Caches are checked against it, so `npm run dev` sees new docs. */
function mtimeOf(file: string) {
	try {
		return statSync(file).mtimeMs;
	} catch {
		return 0;
	}
}

/** A version of the site: a branch of the repository that has docs/index.json. */
export interface VersionInfo {
	/** Name in URLs and in the version select (the branch name, `/` replaced with `-`) */
	name: string;
	branch: string;
}

/** URL-safe name of a branch: `feature/x` becomes `feature-x`. */
export function versionSlug(branch: string) {
	return branch.replace(/[^\w.-]+/g, '-');
}

let versionsCache: { versions: VersionInfo[]; mtime: number } | undefined;

/**
 * Versions of the documentation: the branches that scripts/fetch-docs.ts downloaded from GitHub into data/,
 * or ../docs/index.json as `local` when nothing was downloaded (offline, or DOCS_SOURCE=local).
 */
export function getVersionInfos(): VersionInfo[] {
	const manifestTime = mtimeOf(MANIFEST);
	if (versionsCache?.mtime === manifestTime) return versionsCache.versions;

	let versions: VersionInfo[] = [];

	if (existsSync(MANIFEST)) {
		try {
			versions = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { versions: VersionInfo[] }).versions.filter((version) =>
				existsSync(join(DATA_DIR, `${version.name}.json`)),
			);
		} catch {
			versions = [];
		}
	}

	if (!versions.length) versions = [{ name: LOCAL_VERSION, branch: 'HEAD' }];

	versions.sort((a, b) => {
		const ia = KNOWN_VERSIONS.indexOf(a.name);
		const ib = KNOWN_VERSIONS.indexOf(b.name);

		if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);

		return a.name.localeCompare(b.name, 'en', { numeric: true });
	});

	versionsCache = { versions, mtime: manifestTime };

	return versions;
}

export function getVersions(): string[] {
	return getVersionInfos().map((version) => version.name);
}

export function getDefaultVersion(): string {
	return getVersions()[0]!;
}

/** Forgets the loaded docs, so the next call reads the files again (used by scripts/prerender.ts). */
export function clearDocsCache() {
	cache.clear();
	versionsCache = undefined;
}

export function getDocs(version: string): DocsData {
	const file = version === LOCAL_VERSION ? localDocsPath() : join(DATA_DIR, `${version}.json`);
	const mtime = mtimeOf(file);
	const cached = cache.get(version);
	if (cached?.mtime === mtime) return cached.data;

	if (!mtime) {
		throw new Error(
			version === LOCAL_VERSION
				? `No docs: GitHub could not be reached and ${localDocsPath()} does not exist. Set DOCS_LOCAL_PATH or run with network access.`
				: `No docs file for the version "${version}": ${file}`,
		);
	}

	const data = JSON.parse(readFileSync(file, 'utf8')) as DocsData;

	data.classes ??= [];
	data.interfaces ??= [];
	data.typedefs ??= [];
	data.custom ??= {};

	cache.set(version, { data, mtime });

	return data;
}

/** A typedef that only lists UPPER_CASE constants is an enum (Events, Loop, PlayerErrorCode...). */
export function isEnum(typedef: DocTypedef): boolean {
	return Boolean(typedef.props?.length) && typedef.props!.every((prop) => /^[A-Z][A-Z0-9_]*$/.test(prop.name));
}

export function isPrivate(item: { access?: string }): boolean {
	return item.access === 'private';
}

export function docHref(version: string, kind: 'class' | 'typedef' | 'general', name: string, anchor?: string) {
	return `/docs/${version}/${kind}/${name}/${anchor ? `#${anchor}` : ''}`;
}

/** Guides in the order of docs/index.yml, with the URL slug of each (the file name without `.md`). */
export function getGuides(version: string) {
	const docs = getDocs(version);

	return Object.entries(docs.custom).map(([category, { name, files }]) => ({
		category,
		name,
		files: Object.entries(files).map(([slug, file]) => ({ slug, ...file })),
	}));
}

export function findGuide(version: string, slug: string) {
	for (const category of getGuides(version)) {
		const file = category.files.find((item) => item.slug === slug);
		if (file) return file;
	}

	return undefined;
}

export function getNavigation(version: string): NavSection[] {
	const docs = getDocs(version);
	const sections: NavSection[] = getGuides(version).map((category) => ({
		title: category.name,
		items: category.files.map((file) => ({
			name: file.name,
			href: docHref(version, 'general', file.slug),
			kind: 'guide' as const,
		})),
	}));

	const classes = [...docs.classes, ...docs.interfaces].filter((item) => !isPrivate(item));
	const typedefs = docs.typedefs.filter((item) => !isPrivate(item));

	sections.push(
		{
			title: 'Classes',
			items: classes.map((item) => ({ name: item.name, href: docHref(version, 'class', item.name), kind: 'class' })),
		},
		{
			title: 'Typedefs',
			items: typedefs
				.filter((item) => !isEnum(item))
				.map((item) => ({ name: item.name, href: docHref(version, 'typedef', item.name), kind: 'typedef' })),
		},
		{
			title: 'Enums',
			items: typedefs
				.filter((item) => isEnum(item))
				.map((item) => ({ name: item.name, href: docHref(version, 'typedef', item.name), kind: 'enum' })),
		},
	);

	return sections.filter((section) => section.items.length);
}

export function getSearchIndex(version: string): SearchItem[] {
	const docs = getDocs(version);
	const items: SearchItem[] = [];

	for (const category of getGuides(version)) {
		for (const file of category.files) {
			items.push({ name: file.name, href: docHref(version, 'general', file.slug), kind: 'guide' });
		}
	}

	for (const cls of [...docs.classes, ...docs.interfaces]) {
		if (isPrivate(cls)) continue;

		items.push({ name: cls.name, href: docHref(version, 'class', cls.name), kind: 'class' });

		for (const prop of cls.props ?? []) {
			if (isPrivate(prop)) continue;
			items.push({ name: prop.name, href: docHref(version, 'class', cls.name, prop.name), kind: 'property', parent: cls.name });
		}

		for (const method of cls.methods ?? []) {
			if (isPrivate(method)) continue;
			items.push({ name: method.name, href: docHref(version, 'class', cls.name, method.name), kind: 'method', parent: cls.name });
		}

		for (const event of cls.events ?? []) {
			items.push({ name: event.name, href: docHref(version, 'class', cls.name, `event-${event.name}`), kind: 'event', parent: cls.name });
		}
	}

	for (const typedef of docs.typedefs) {
		if (isPrivate(typedef)) continue;
		items.push({ name: typedef.name, href: docHref(version, 'typedef', typedef.name), kind: isEnum(typedef) ? 'enum' : 'typedef' });
	}

	return items;
}

/** Names that have their own page, for linking types. */
const linkTargets = new Map<DocsData, Map<string, string>>();

export function getLinkTargets(version: string): Map<string, string> {
	const docs = getDocs(version);
	const cachedTargets = linkTargets.get(docs);
	if (cachedTargets) return cachedTargets;

	const targets = new Map<string, string>();
	linkTargets.set(docs, targets);

	for (const cls of [...docs.classes, ...docs.interfaces]) targets.set(cls.name, docHref(version, 'class', cls.name));
	for (const typedef of docs.typedefs) targets.set(typedef.name, docHref(version, 'typedef', typedef.name));

	return targets;
}

export function sourceUrl(version: string, meta?: DocMeta) {
	if (!meta) return undefined;

	const branch = getVersionInfos().find((info) => info.name === version)?.branch ?? 'HEAD';

	return `https://github.com/${REPOSITORY}/blob/${branch}/${meta.path}/${meta.file}#L${meta.line}`;
}
