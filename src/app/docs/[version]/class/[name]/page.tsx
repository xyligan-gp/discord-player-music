import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CodeExample, Description, ParamsTable, SectionTitle, SourceLink, Tag, TypeView } from '@/components/DocParts';
import { KindBadge } from '@/components/KindBadge';
import { Deprecated, EventMember, Examples, MethodMember, PropertyMember, SeeAlso } from '@/components/Members';
import { Outline } from '@/components/Outline';
import { getDocs, getVersions, isPrivate } from '@/lib/docs';

interface Params {
	readonly params: Promise<{ version: string; name: string }>;
}

export const dynamicParams = false;

function findClass(version: string, name: string) {
	const docs = getDocs(version);

	return [...docs.classes, ...docs.interfaces].find((item) => item.name === name);
}

export function generateStaticParams() {
	return getVersions().flatMap((version) => {
		const docs = getDocs(version);

		return [...docs.classes, ...docs.interfaces].map((item) => ({ version, name: item.name }));
	});
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { version, name } = await params;
	const cls = findClass(version, name);

	return { title: name, description: cls?.description };
}

const byName = <T extends { name: string; scope?: string }>(a: T, b: T) =>
	Number(b.scope === 'static') - Number(a.scope === 'static') || a.name.localeCompare(b.name);

export default async function ClassPage({ params }: Params) {
	const { version, name } = await params;
	const cls = findClass(version, name);
	if (!cls) notFound();

	const props = (cls.props ?? []).filter((prop) => !isPrivate(prop)).sort(byName);
	const methods = (cls.methods ?? []).filter((method) => !isPrivate(method)).sort(byName);
	const events = [...(cls.events ?? [])].sort(byName);
	const constructorParams = cls.construct?.params ?? [];

	return (
		<div className="mx-auto flex max-w-6xl gap-10">
			<article className="min-w-0 grow">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<h1 className="flex flex-wrap items-center gap-3 font-mono text-3xl font-bold break-all">
						<KindBadge kind="class" size="lg" />
						{cls.name}
						{cls.abstract ? <Tag>abstract</Tag> : null}
						{cls.deprecated ? <Tag tone="danger">deprecated</Tag> : null}
					</h1>
					<SourceLink meta={cls.meta} version={version} />
				</header>

				{cls.extends?.length || cls.implements?.length ? (
					<p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
						{cls.extends?.length ? (
							<span>
								<span className="text-muted">extends </span>
								<TypeView type={cls.extends} version={version} />
							</span>
						) : null}
						{cls.implements?.length ? (
							<span>
								<span className="text-muted">implements </span>
								<TypeView type={cls.implements} version={version} />
							</span>
						) : null}
					</p>
				) : null}

				<Deprecated value={cls.deprecated} version={version} />
				<Description className="mt-4 text-base" text={cls.description} version={version} />
				<Examples examples={cls.examples} />
				<SeeAlso see={cls.see} version={version} />

				{cls.construct ? (
					<>
						<SectionTitle id="constructor">Constructor</SectionTitle>
						<CodeExample
							code={`new ${cls.name}(${constructorParams
								.filter((param) => !param.name.includes('.'))
								.map((param) => `${param.name}${param.optional ? '?' : ''}`)
								.join(', ')});`}
						/>
						<Description text={cls.construct.description} version={version} />
						{constructorParams.length ? <ParamsTable params={constructorParams} version={version} /> : null}
					</>
				) : null}

				{props.length ? (
					<>
						<SectionTitle id="properties">Properties</SectionTitle>
						{props.map((prop) => (
							<PropertyMember key={prop.name} prop={prop} version={version} />
						))}
					</>
				) : null}

				{methods.length ? (
					<>
						<SectionTitle id="methods">Methods</SectionTitle>
						{methods.map((method) => (
							<MethodMember key={method.name} method={method} version={version} />
						))}
					</>
				) : null}

				{events.length ? (
					<>
						<SectionTitle id="events">Events</SectionTitle>
						{events.map((event) => (
							<EventMember event={event} key={event.name} version={version} />
						))}
					</>
				) : null}
			</article>

			<Outline
				groups={[
					{ title: 'Properties', items: props.map((prop) => ({ id: prop.name, name: prop.name, kind: 'property' as const })) },
					{ title: 'Methods', items: methods.map((method) => ({ id: method.name, name: method.name, kind: 'method' as const })) },
					{ title: 'Events', items: events.map((event) => ({ id: `event-${event.name}`, name: event.name, kind: 'event' as const })) },
				]}
			/>
		</div>
	);
}
