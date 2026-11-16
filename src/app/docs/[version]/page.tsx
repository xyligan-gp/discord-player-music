import { Redirect } from '@/components/Redirect';
import { getGuides, getVersions } from '@/lib/docs';

export const dynamicParams = false;

export function generateStaticParams() {
	return getVersions().map((version) => ({ version }));
}

export default async function VersionPage({ params }: { readonly params: Promise<{ version: string }> }) {
	const { version } = await params;
	const first = getGuides(version)[0]?.files[0]?.slug ?? 'welcome';

	return <Redirect to={`/docs/${version}/general/${first}/`} />;
}
