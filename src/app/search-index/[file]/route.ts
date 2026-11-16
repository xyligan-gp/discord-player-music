import { getSearchIndex, getVersions } from '@/lib/docs';

/**
 * `/search-index/<version>.json`: the search loads it when it opens for the first time,
 * so the index is not inside every page.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
	return getVersions().map((version) => ({ file: `${version}.json` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
	const { file } = await params;

	return Response.json(getSearchIndex(file.replace(/\.json$/, '')));
}
