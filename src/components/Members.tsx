import Link from 'next/link';
import type { ReactNode } from 'react';
import { docHref, type DocEvent, type DocMethod, type DocProp } from '@/lib/docs';
import { seeToMarkdown } from '@/lib/links';
import { resolveTarget } from '@/lib/markdown';
import { CodeExample, Description, normalizeReturns, ParamsTable, signature, SourceLink, SubTitle, Tag, TypeView } from './DocParts';

function MemberShell({ id, name, title, tags, version, meta, children }: { readonly id: string; readonly name: string; readonly title: ReactNode; readonly tags?: ReactNode; readonly version: string; readonly meta?: DocProp['meta']; readonly children: ReactNode }) {
	return (
		<section className="scroll-mt-6 border-b border-line py-6 last:border-b-0" id={id}>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<h3 className="flex min-w-0 flex-wrap items-center gap-2 font-mono text-lg font-semibold break-all">
					<span>
						<a className="hover:underline" href={`#${id}`}>
							{name}
						</a>
						{title}
					</span>
					{tags}
				</h3>
				<SourceLink meta={meta} version={version} />
			</div>
			<div className="mt-2">{children}</div>
		</section>
	);
}

function Deprecated({ value, version }: { readonly value?: string | boolean; readonly version: string }) {
	if (!value) return null;

	return (
		<div className="my-3 rounded-md border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm">
			<p className="font-semibold text-rose-700 dark:text-rose-400">Deprecated</p>
			{typeof value === 'string' ? <Description text={value} version={version} /> : null}
		</div>
	);
}

function Examples({ examples }: { readonly examples?: string[] }) {
	if (!examples?.length) return null;

	return (
		<>
			<SubTitle>{examples.length > 1 ? 'Examples' : 'Example'}</SubTitle>
			{examples.map((example, index) => (
				<CodeExample code={example} key={index} />
			))}
		</>
	);
}

function SeeAlso({ see, version }: { readonly see?: string[]; readonly version: string }) {
	if (!see?.length) return null;

	return (
		<>
			<SubTitle>See also</SubTitle>
			<ul className="list-disc pl-5 text-sm">
				{see.map((item) => (
					<li key={item}>
						<Description text={seeToMarkdown(item)} version={version} />
					</li>
				))}
			</ul>
		</>
	);
}

export function PropertyMember({ prop, version }: { readonly prop: DocProp; readonly version: string }) {
	return (
		<MemberShell
			id={prop.name}
			meta={prop.meta}
			tags={
				<>
					{prop.scope === 'static' ? <Tag>static</Tag> : null}
					{prop.readonly ? <Tag>readonly</Tag> : null}
					{prop.optional ? <Tag>optional</Tag> : null}
					{prop.deprecated ? <Tag tone="danger">deprecated</Tag> : null}
				</>
			}
			name={prop.name}
			title={
				<>
					<span className="font-normal text-muted">:</span>{' '}
					<span className="font-normal">
						<TypeView type={prop.type} version={version} />
					</span>
				</>
			}
			version={version}
		>
			<Deprecated value={prop.deprecated} version={version} />
			<Description text={prop.description} version={version} />
			{prop.props?.length ? <ParamsTable label="Property" params={prop.props} version={version} /> : null}
			<Examples examples={prop.examples} />
			<SeeAlso see={prop.see} version={version} />
		</MemberShell>
	);
}

export function MethodMember({ method, version }: { readonly method: DocMethod; readonly version: string }) {
	const returns = normalizeReturns(method.returns);
	const inheritedFrom = method.inherits?.split('#')[0];

	return (
		<MemberShell
			id={method.name}
			meta={method.meta}
			tags={
				<>
					{method.scope === 'static' ? <Tag>static</Tag> : null}
					{method.async ? <Tag tone="info">async</Tag> : null}
					{method.abstract ? <Tag>abstract</Tag> : null}
					{method.deprecated ? <Tag tone="danger">deprecated</Tag> : null}
				</>
			}
			name={method.name}
			title={
				<>
					<span className="font-normal text-muted">{signature(method.params)}</span>
				</>
			}
			version={version}
		>
			<Deprecated value={method.deprecated} version={version} />
			<Description text={method.description} version={version} />
			{inheritedFrom ? (
				<p className="mt-2 text-sm text-muted">
					Inherited from{' '}
					<Link className="text-blurple hover:underline dark:text-blurple-light" href={docHref(version, 'class', inheritedFrom, method.name)}>
						{inheritedFrom}
					</Link>
				</p>
			) : null}
			{method.params?.length ? <ParamsTable params={method.params} version={version} /> : null}
			{returns ? (
				<>
					<SubTitle>Returns</SubTitle>
					<p>
						<TypeView type={returns.types} version={version} />
					</p>
					<Description className="mt-1" text={returns.description} version={version} />
				</>
			) : null}
			{method.throws?.length ? (
				<>
					<SubTitle>Throws</SubTitle>
					<TypeView type={method.throws} version={version} />
				</>
			) : null}
			{method.emits?.length ? (
				<>
					<SubTitle>Emits</SubTitle>
					<ul className="flex flex-wrap gap-2">
						{method.emits.map((emit) => {
							const href = resolveTarget(version, emit.replace('#event:', '#event-'));

							return (
								<li key={emit}>
									{href ? (
										<Link className="font-mono text-sm text-blurple hover:underline dark:text-blurple-light" href={href}>
											{emit.replace('#event:', '#')}
										</Link>
									) : (
										<span className="font-mono text-sm">{emit}</span>
									)}
								</li>
							);
						})}
					</ul>
				</>
			) : null}
			<Examples examples={method.examples} />
			<SeeAlso see={method.see} version={version} />
		</MemberShell>
	);
}

export function EventMember({ event, version }: { readonly event: DocEvent; readonly version: string }) {
	return (
		<MemberShell
			id={`event-${event.name}`}
			meta={event.meta}
			tags={event.deprecated ? <Tag tone="danger">deprecated</Tag> : null}
			name={event.name}
			title={
				<>
					<span className="font-normal text-muted">{signature(event.params)}</span>
				</>
			}
			version={version}
		>
			<Deprecated value={event.deprecated} version={version} />
			<Description text={event.description} version={version} />
			{event.params?.length ? <ParamsTable params={event.params} version={version} /> : null}
			<Examples examples={event.examples} />
			<SeeAlso see={event.see} version={version} />
		</MemberShell>
	);
}

export { Deprecated, Examples, SeeAlso };
