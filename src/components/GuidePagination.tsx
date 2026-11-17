import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { docHref, getGuides } from '@/lib/docs';

/** "Previous" and "Next" links at the bottom of a guide, in the order of the sidebar. */
export function GuidePagination({ version, slug }: { version: string; slug: string }) {
	const guides = getGuides(version).flatMap((category) => category.files);
	const index = guides.findIndex((guide) => guide.slug === slug);
	const previous = guides[index - 1];
	const next = guides[index + 1];

	if (index === -1 || (!previous && !next)) return null;

	const card =
		'group flex min-w-0 flex-col gap-1 rounded-lg border border-line px-3 py-3 sm:px-4 transition-colors hover:border-blurple dark:hover:border-blurple-light';

	return (
		<nav aria-label="Guide pagination" className="mt-12 grid grid-cols-2 gap-2 border-t border-line pt-6 sm:gap-3">
			{previous ? (
				<Link className={card} href={docHref(version, 'general', previous.slug)}>
					<span className="flex items-center gap-1 text-xs text-muted">
						<ArrowLeft size={14} /> Previous
					</span>
					<span className="truncate font-medium">{previous.name}</span>
				</Link>
			) : (
				<span />
			)}
			{next && (
				<Link className={`${card} col-start-2 items-end text-right`} href={docHref(version, 'general', next.slug)}>
					<span className="flex items-center gap-1 text-xs text-muted">
						Next <ArrowRight size={14} />
					</span>
					<span className="max-w-full truncate font-medium">{next.name}</span>
				</Link>
			)}
		</nav>
	);
}
