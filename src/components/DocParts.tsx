import { Code2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { getLinkTargets, sourceUrl, type DocMeta, type DocParam, type DocReturns, type DocType } from '@/lib/docs';
import { EXTERNAL_TYPES } from '@/lib/links';
import { exampleLanguage, highlight, renderMarkdown } from '@/lib/markdown';
import { cx } from './styles';

/** A docgen type (`Promise<PlayerTrack | null>`) with links to the pages of known types. */
export function TypeView({ type, version }: { readonly type?: DocType; readonly version: string }) {
	if (!type?.length) return <span className="text-muted">*</span>;

	const targets = getLinkTargets(version);

	return (
		<span className="font-mono text-[0.9em]">
			{type.map((member, index) => (
				<Fragment key={index}>
					{index > 0 ? <span className="text-muted"> | </span> : null}
					{member.map(([name, punctuation], tokenIndex) => {
						const page = targets.get(name);
						const external = EXTERNAL_TYPES[name];

						return (
							<Fragment key={tokenIndex}>
								{page ? (
									<Link className="text-blurple hover:underline dark:text-blurple-light" href={page}>
										{name}
									</Link>
								) : external ? (
									<a
										className="text-blurple hover:underline dark:text-blurple-light"
										href={external}
										rel="noopener noreferrer"
										target="_blank"
									>
										{name}
									</a>
								) : (
									<span>{name}</span>
								)}
								{punctuation ? <span className="text-muted">{punctuation}</span> : null}
							</Fragment>
						);
					})}
				</Fragment>
			))}
		</span>
	);
}

export async function Description({ text, version, className }: { readonly text?: string; readonly version: string; readonly className?: string }) {
	if (!text) return null;

	const html = await renderMarkdown(text, version);

	return <div className={cx('docs-prose docs-description', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export async function CodeExample({ code }: { readonly code: string }) {
	const html = await highlight(code, exampleLanguage(code));

	return <div className="docs-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SectionTitle({ children, id }: { readonly children: ReactNode; readonly id?: string }) {
	return (
		<h2 className="mt-12 mb-4 scroll-mt-6 border-b border-line pb-2 text-2xl font-bold" id={id}>
			{children}
		</h2>
	);
}

export function SubTitle({ children }: { readonly children: ReactNode }) {
	return <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{children}</h4>;
}

export function SourceLink({ version, meta }: { readonly version: string; readonly meta?: DocMeta }) {
	const href = sourceUrl(version, meta);
	if (!href) return null;

	return (
		<a
			aria-label="Source code"
			className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-neutral-900 dark:hover:text-neutral-50"
			href={href}
			rel="noopener noreferrer"
			target="_blank"
			title={`${meta!.path}/${meta!.file}:${meta!.line}`}
		>
			<Code2 size={14} />
			Source
			<ExternalLink size={12} />
		</a>
	);
}

export function Tag({ children, tone = 'neutral' }: { readonly children: ReactNode; readonly tone?: 'neutral' | 'warning' | 'danger' | 'info' }) {
	return (
		<span
			className={cx(
				'inline-flex items-center rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide',
				tone === 'neutral' && 'bg-black/5 text-muted dark:bg-white/10',
				tone === 'warning' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
				tone === 'danger' && 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
				tone === 'info' && 'bg-blurple/15 text-blurple dark:text-blurple-light',
			)}
		>
			{children}
		</span>
	);
}

function formatDefault(value: unknown) {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Parameters or typedef properties as a list (name, type, optional, default, description under them):
 * long descriptions stay readable on any width, unlike a table.
 */
export async function ParamsTable({ params, version, label = 'Parameter' }: { readonly params: DocParam[]; readonly version: string; readonly label?: string }) {
	return (
		<ul aria-label={`${label}s`} className="my-3 divide-y divide-line overflow-hidden rounded-lg border border-line">
			{params.map((param) => {
				const depth = param.name.split('.').length - 1;
				const parent = depth ? `${param.name.slice(0, param.name.lastIndexOf('.'))}.` : '';
				const name = param.name.slice(parent.length);

				return (
					<li
						className="scroll-mt-6 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
						id={label === 'Parameter' ? undefined : param.name}
						key={param.name}
						style={depth ? { paddingLeft: `${1 + depth * 1.25}rem` } : undefined}
					>
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							<span className="font-mono text-[15px] font-semibold">
								{parent ? <span className="font-normal text-muted">{parent}</span> : null}
								{param.variable ? '...' : ''}
								{name}
								{param.optional ? <span className="text-muted">?</span> : null}
							</span>
							<span className="text-muted">:</span>
							<span className="min-w-0 break-words">
								<TypeView type={param.type} version={version} />
								{param.nullable ? <span className="font-mono text-muted"> | null</span> : null}
							</span>
							{param.optional ? <Tag>optional</Tag> : null}
							{param.default !== undefined ? (
								<span className="text-xs text-muted">
									default:{' '}
									<code className="rounded bg-black/5 px-1 py-0.5 font-mono text-neutral-800 dark:bg-white/10 dark:text-neutral-200">
										{formatDefault(param.default)}
									</code>
								</span>
							) : null}
						</div>
						<Description className="mt-1 text-[15px]" text={param.description} version={version} />
					</li>
				);
			})}
		</ul>
	);
}

export function normalizeReturns(returns?: DocReturns | DocType): DocReturns | undefined {
	if (!returns) return undefined;

	return Array.isArray(returns) ? { types: returns } : returns;
}

/** `(guildID, track?)` */
export function signature(params?: DocParam[]) {
	return `(${(params ?? [])
		.filter((param) => !param.name.includes('.'))
		.map((param) => `${param.variable ? '...' : ''}${param.name}${param.optional ? '?' : ''}`)
		.join(', ')})`;
}
