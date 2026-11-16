/**
 * Link helpers shared by the markdown renderer and the type renderer.
 */

const DJS = 'https://discord.js.org/docs/packages';
const NODE = 'https://nodejs.org/api';
const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects';

/** Types from other libraries and from JavaScript itself, linked to their own documentation. */
export const EXTERNAL_TYPES: Record<string, string> = {
	Client: `${DJS}/discord.js/stable/Client:Class`,
	Guild: `${DJS}/discord.js/stable/Guild:Class`,
	GuildMember: `${DJS}/discord.js/stable/GuildMember:Class`,
	Message: `${DJS}/discord.js/stable/Message:Class`,
	TextChannel: `${DJS}/discord.js/stable/TextChannel:Class`,
	User: `${DJS}/discord.js/stable/User:Class`,
	VoiceChannel: `${DJS}/discord.js/stable/VoiceChannel:Class`,
	VoiceBasedChannel: `${DJS}/discord.js/stable/VoiceBasedChannel:TypeAlias`,
	Collection: `${DJS}/collection/stable/Collection:Class`,
	AudioPlayer: `${DJS}/voice/stable/AudioPlayer:Class`,
	VoiceConnection: `${DJS}/voice/stable/VoiceConnection:Class`,
	Innertube: 'https://ytjs.dev/api/classes/Innertube',
	Buffer: `${NODE}/buffer.html#class-buffer`,
	Readable: `${NODE}/stream.html#class-streamreadable`,
	EventEmitter: `${NODE}/events.html#class-eventemitter`,
	Array: `${MDN}/Array`,
	AsyncGenerator: `${MDN}/AsyncGenerator`,
	Error: `${MDN}/Error`,
	Object: `${MDN}/Object`,
	Promise: `${MDN}/Promise`,
	Record: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type',
	String: `${MDN}/String`,
	string: `${MDN}/String`,
	number: `${MDN}/Number`,
	boolean: `${MDN}/Boolean`,
	object: `${MDN}/Object`,
	function: `${MDN}/Function`,
	null: `${MDN}/null`,
	undefined: `${MDN}/undefined`,
};

const OLD_SITE = /^(?:https?:\/\/(?:www\.)?dpm\.js\.org)?\/?#\/docs\/(?:discord-player-music\/)?([^/]+)\/(general|class|typedef)\/([^?#/]+)(?:\?scrollTo=([^&#]+))?/;

/**
 * Converts a link of the old site (`https://dpm.js.org/#/docs/discord-player-music/stable/class/Player?scrollTo=search`)
 * into a path of this site, or returns `undefined` when it is not one.
 */
export function convertOldSiteLink(href: string): string | undefined {
	const match = OLD_SITE.exec(href);
	if (!match) return undefined;

	const [, version, kind, name, scrollTo] = match;
	let anchor = scrollTo ? decodeURIComponent(scrollTo) : '';

	// The old site used `e-<name>` for events and `s-<name>` for static members
	if (anchor.startsWith('e-')) anchor = `event-${anchor.slice(2)}`;
	else if (anchor.startsWith('s-')) anchor = anchor.slice(2);

	return `/docs/${version}/${kind}/${name}/${anchor ? `#${anchor}` : ''}`;
}

/**
 * Rewrites a link found in a markdown page or a JSDoc description:
 * - links of the old site become paths of this site, in the same version;
 * - relative links to other `.md` files of docs/general become guide pages (`./faq.md#errors`);
 * - other links stay as they are.
 */
export function rewriteHref(href: string, version: string, guideSlugs: Set<string>): string {
	// A link to the old site inside the docs of a branch means the page of that same branch:
	// the dev docs link to `.../stable/general/providers` that only exists in dev until the release
	const old = convertOldSiteLink(href);
	if (old) return old.replace(/^\/docs\/[^/]+/, `/docs/${version}`);

	if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('/')) return href;

	const [path = '', hash] = href.split('#');
	const md = /(?:^|\/)([^/]+)\.md$/i.exec(path);

	if (md) {
		const slug = md[1]!.toLowerCase();

		// examples/index.md is the `index` guide, the same key docgen gives it
		if (guideSlugs.has(slug)) return `/docs/${version}/general/${slug}/${hash ? `#${hash}` : ''}`;
	}

	return href;
}

/** Replaces JSDoc `{@link Target}` / `{@link Target|text}` / `{@link Target#member text}` with markdown links. */
export function replaceJsdocLinks(text: string, resolve: (target: string) => string | undefined): string {
	return text.replace(/\{@link(?:code|plain)?\s+([^}|\s]+)(?:[|\s]+([^}]*))?\}/g, (_, target: string, label?: string) => {
		const href = resolve(target);
		const text = label?.trim() || target;

		return href ? `[\`${text}\`](${href})` : `\`${text}\``;
	});
}

/** An `@see` entry as markdown: a bare name becomes a link. */
export function seeToMarkdown(see: string) {
	return /\{@link/.test(see) || /\s/.test(see.trim()) ? see : `{@link ${see}}`;
}
