import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Description, normalizeReturns, ParamsTable, SectionTitle, SourceLink, SubTitle, Tag, TypeView } from '@/components/DocParts';
import { KindBadge } from '@/components/KindBadge';
import { Deprecated, Examples, SeeAlso } from '@/components/Members';
import { Outline } from '@/components/Outline';
import { getDocs, getVersions, isEnum } from '@/lib/docs';

interface Params {
	readonly params: Promise<{ version: string; name: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
	return getVersions().flatMap((version) => getDocs(version).typedefs.map((item) => ({ version, name: item.name })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { version, name } = await params;
	const typedef = getDocs(version).typedefs.find((item) => item.name === name);

	return { title: name, description: typedef?.description };
}

export default async function TypedefPage({ params }: Params) {
	const { version, name } = await params;
	const typedef = getDocs(version).typedefs.find((item) => item.name === name);
	if (!typedef) notFound();

	const enumLike = isEnum(typedef);
	const returns = normalizeReturns(typedef.returns);
	const isPlainObject = typedef.type?.length === 1 && typedef.type[0]?.length === 1 && ['object', 'Object'].includes(typedef.type[0][0]![0]);

	return (
		<div className="mx-auto flex max-w-6xl gap-10">
			<article className="min-w-0 grow">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<h1 className="flex flex-wrap items-center gap-3 font-mono text-3xl font-bold break-all">
						<KindBadge kind={enumLike ? 'enum' : 'typedef'} size="lg" />
						{typedef.name}
						{typedef.deprecated ? <Tag tone="danger">deprecated</Tag> : null}
					</h1>
					<SourceLink meta={typedef.meta} version={version} />
				</header>

				{typedef.type?.length && !isPlainObject && !enumLike ? (
					<p className="mt-3 text-sm">
						<span className="text-muted">type: </span>
						<TypeView type={typedef.type} version={version} />
					</p>
				) : null}

				<Deprecated value={typedef.deprecated} version={version} />
				<Description className="mt-4 text-base" text={typedef.description} version={version} />
				<Examples examples={typedef.examples} />
				<SeeAlso see={typedef.see} version={version} />

				{typedef.props?.length ? (
					<>
						<SectionTitle id="properties">{enumLike ? 'Members' : 'Properties'}</SectionTitle>
						<ParamsTable label={enumLike ? 'Member' : 'Property'} params={typedef.props} version={version} />
					</>
				) : null}

				{typedef.params?.length ? (
					<>
						<SectionTitle id="parameters">Parameters</SectionTitle>
						<ParamsTable params={typedef.params} version={version} />
					</>
				) : null}

				{returns ? (
					<>
						<SubTitle>Returns</SubTitle>
						<TypeView type={returns.types} version={version} />
						<Description className="mt-1" text={returns.description} version={version} />
					</>
				) : null}
			</article>

			<Outline
				groups={[
					{
						title: enumLike ? 'Members' : 'Properties',
						items: (typedef.props ?? []).filter((prop) => !prop.name.includes('.')).map((prop) => ({ id: prop.name, name: prop.name })),
					},
				]}
			/>
		</div>
	);
}
