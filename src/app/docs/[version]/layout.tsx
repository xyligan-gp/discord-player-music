import type { PropsWithChildren } from 'react';
import { Footer } from '@/components/Footer';
import { Sidebar } from '@/components/Sidebar';
import { getNavigation, getVersions, PACKAGE_NAME, REPOSITORY } from '@/lib/docs';

export const dynamicParams = false;

export function generateStaticParams() {
	return getVersions().map((version) => ({ version }));
}

export default async function DocsLayout({ children, params }: PropsWithChildren<{ readonly params: Promise<{ version: string }> }>) {
	const { version } = await params;

	return (
		<div className="lg:flex">
			<Sidebar
				packageName={PACKAGE_NAME}
				repository={REPOSITORY}
				sections={getNavigation(version)}
				version={version}
				versions={getVersions()}
			/>
			<div className="min-w-0 grow lg:py-2 lg:pr-2">
				<main className="min-h-dvh bg-surface px-4 py-8 sm:px-8 lg:min-h-[calc(100dvh-1rem)] lg:rounded-lg lg:border lg:border-line lg:px-10 dark:bg-panel">
					{children}
					<Footer />
				</main>
			</div>
		</div>
	);
}
