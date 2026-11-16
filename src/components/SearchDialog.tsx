'use client';

import { Command } from 'cmdk';
import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { SearchItem } from '@/lib/docs';
import { KindBadge } from './KindBadge';

const MAX_RESULTS = 60;

/** Pages first, then members, when two results match equally well. */
const KIND_ORDER: Record<SearchItem['kind'], number> = { class: 0, guide: 1, typedef: 2, enum: 2, method: 3, property: 4, event: 5 };

/** Exact name, then name prefix, then contains, then the parent class. */
function score(item: SearchItem, query: string) {
	const name = item.name.toLowerCase();
	const full = item.parent ? `${item.parent}.${item.name}`.toLowerCase() : name;

	if (name === query || full === query) return 0;
	if (name.startsWith(query) || full.startsWith(query)) return 1;
	if (name.includes(query) || full.includes(query)) return 2;

	return -1;
}

const indexes = new Map<string, Promise<SearchItem[]>>();

/** The index of a version, loaded once from /search-index/<version>.json. */
export function loadSearchIndex(version: string) {
	let index = indexes.get(version);

	if (!index) {
		index = fetch(`/search-index/${version}.json`)
			.then((response) => (response.ok ? (response.json() as Promise<SearchItem[]>) : []))
			.catch(() => {
				indexes.delete(version);
				return [];
			});
		indexes.set(version, index);
	}

	return index;
}

export function SearchDialog({
	version,
	open,
	onOpenChange,
}: {
	readonly version: string;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [query, setQuery] = useState('');
	const [items, setItems] = useState<SearchItem[]>([]);

	// Load the index when the browser is idle, so the search is ready at the first key press
	useEffect(() => {
		let cancelled = false;
		const load = () => loadSearchIndex(version).then((index) => !cancelled && setItems(index));
		const timer = setTimeout(load, 800);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [version]);

	useEffect(() => {
		if (open) loadSearchIndex(version).then(setItems);
	}, [open, version]);

	useEffect(() => {
		if (!open) setQuery('');
	}, [open]);

	const results = useMemo(() => {
		const value = query.trim().toLowerCase().replace(/#/g, '.');
		if (!value) return items.filter((item) => item.kind === 'guide' || item.kind === 'class').slice(0, MAX_RESULTS);

		return items
			.map((item) => ({ item, rank: score(item, value) }))
			.filter(({ rank }) => rank !== -1)
			.sort((a, b) => a.rank - b.rank || KIND_ORDER[a.item.kind] - KIND_ORDER[b.item.kind] || a.item.name.length - b.item.name.length)
			.slice(0, MAX_RESULTS)
			.map(({ item }) => item);
	}, [items, query]);

	return (
		<Command.Dialog
			contentClassName="search-content fixed left-1/2 top-[12vh] z-[61] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl dark:bg-panel"
			label="Search the documentation"
			onOpenChange={onOpenChange}
			open={open}
			overlayClassName="search-overlay fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
			shouldFilter={false}
		>
			<div className="flex items-center gap-2 border-b border-line px-4">
				<Search className="text-muted" size={18} />
				<Command.Input
					autoFocus
					className="h-14 grow bg-transparent text-base outline-none placeholder:text-muted"
					onValueChange={setQuery}
					placeholder="Search classes, methods, typedefs, guides..."
					value={query}
				/>
				<kbd className="rounded border border-line px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
			</div>
			<Command.List className="max-h-[60vh] overflow-y-auto p-2">
				<Command.Empty className="p-6 text-center text-sm text-muted">Nothing found.</Command.Empty>
				{results.map((item, index) => (
					<Command.Item
						className="search-item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors duration-100 data-[selected=true]:bg-active"
						key={item.href}
						onSelect={() => {
							onOpenChange(false);
							router.push(item.href);
						}}
						style={{ '--i': index } as CSSProperties}
						value={item.href}
					>
						<KindBadge kind={item.kind} />
						<span className="truncate font-mono text-sm">
							{item.parent ? <span className="text-muted">{item.parent}.</span> : null}
							{item.name}
						</span>
						<span className="ml-auto shrink-0 text-xs text-muted">{item.kind}</span>
						<CornerDownLeft aria-hidden className="search-item-arrow shrink-0 text-muted" size={14} />
					</Command.Item>
				))}
			</Command.List>
		</Command.Dialog>
	);
}
