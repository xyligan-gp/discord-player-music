'use client';

import { useEffect, useState } from 'react';
import type { BadgeKind } from './styles';
import { cx } from './styles';

export interface OutlineGroup {
	title: string;
	items: { id: string; name: string; kind?: BadgeKind; level?: number }[];
}

/** "On this page" list on the right side of wide screens, with the section in view highlighted. */
export function Outline({ groups }: { readonly groups: OutlineGroup[] }) {
	const [active, setActive] = useState<string>();

	useEffect(() => {
		const ids = groups.flatMap((group) => group.items.map((item) => item.id));
		const elements = ids.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) setActive(visible[0].target.id);
			},
			{ rootMargin: '0px 0px -70% 0px' },
		);

		for (const element of elements) observer.observe(element);

		return () => observer.disconnect();
	}, [groups]);

	if (!groups.some((group) => group.items.length)) return null;

	return (
		<nav aria-label="On this page" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-60 shrink-0 overflow-y-auto pr-2 text-sm [scrollbar-width:thin] xl:block">
			<p className="mb-3 font-semibold">On this page</p>
			{groups.map((group) =>
				group.items.length ? (
					<div className="mb-4" key={group.title}>
						{group.title ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.title}</p> : null}
						<ul className="flex flex-col border-l border-line">
							{group.items.map((item) => (
								<li key={item.id}>
									<a
										className={cx(
											'-ml-px block truncate border-l py-1 pr-2 transition-colors',
											item.level === 3 ? 'pl-6' : 'pl-3',
											active === item.id
												? 'border-blurple font-medium text-neutral-900 dark:text-neutral-50'
												: 'border-transparent text-muted hover:text-neutral-900 dark:hover:text-neutral-50',
										)}
										href={`#${item.id}`}
										title={item.name}
									>
										{item.name}
									</a>
								</li>
							))}
						</ul>
					</div>
				) : null,
			)}
		</nav>
	);
}
