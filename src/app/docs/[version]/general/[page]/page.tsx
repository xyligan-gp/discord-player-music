import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuidePagination } from '@/components/GuidePagination';
import { Outline } from '@/components/Outline';
import { siteConfig } from '@/config';
import { GuideInfo } from '@/components/GuideInfo';
import { findGuide, getGuideDates, getGuides, getVersions, readingMinutes } from '@/lib/docs';
import { extractHeadings, renderMarkdown } from '@/lib/markdown';

interface Params {
	readonly params: Promise<{ version: string; page: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
	return getVersions().flatMap((version) =>
		getGuides(version).flatMap((category) => category.files.map((file) => ({ version, page: file.slug }))),
	);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { version, page } = await params;

	return { title: findGuide(version, page)?.name ?? page };
}

export default async function GuidePage({ params }: Params) {
	const { version, page } = await params;
	const guide = findGuide(version, page);
	if (!guide) notFound();

	const html = await renderMarkdown(guide.content, version);
	const headings = extractHeadings(html);

	return (
		<div className="mx-auto flex max-w-6xl gap-10">
			<div className="min-w-0 grow">
				<GuideInfo minutes={readingMinutes(guide.content)} updatedAt={getGuideDates(version)[page]} />
				<article className="docs-prose" dangerouslySetInnerHTML={{ __html: html }} />
				{siteConfig.guidePagination && <GuidePagination slug={page} version={version} />}
			</div>
			<Outline
				groups={[
					{
						title: '',
						items: headings.map((heading) => ({ id: heading.id, name: heading.text, level: heading.level })),
					},
				]}
			/>
		</div>
	);
}
