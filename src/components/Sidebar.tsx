'use client';

import { Check, ChevronDown, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { NavSection } from '@/lib/docs';
import { GitHubIcon } from './GitHubIcon';
import { KindBadge } from './KindBadge';
import { SearchDialog } from './SearchDialog';
import { cx, field, iconButton } from './styles';
import { ThemeSwitch } from './ThemeSwitch';

interface SidebarProps {
	readonly packageName: string;
	readonly repository: string;
	readonly version: string;
	readonly versions: string[];
	readonly sections: NavSection[];
}

export function Sidebar(props: SidebarProps) {
	const [open, setOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const pathname = usePathname();
	const navRef = useRef<HTMLElement>(null);

	// Close the drawer after navigation on phones
	useEffect(() => setOpen(false), [pathname]);

	// Show the current page in the navigation when it is far down the list
	useEffect(() => {
		// Only the navigation scrolls: scrollIntoView would move the page too
		const nav = navRef.current;
		const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
		if (!nav || !active) return;

		const top = active.offsetTop - nav.offsetTop;
		if (top < nav.scrollTop || top + active.offsetHeight > nav.scrollTop + nav.clientHeight) {
			nav.scrollTop = top - nav.clientHeight / 2;
		}
	}, [pathname]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setSearchOpen((value) => !value);
			}

			if (event.key === '/' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
				event.preventDefault();
				setSearchOpen(true);
			}
		};

		window.addEventListener('keydown', onKeyDown);

		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<>
			{/* Top bar on small screens */}
			<div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-sidebar/90 px-4 py-3 backdrop-blur lg:hidden">
				<button aria-label="Open navigation" className={iconButton} onClick={() => setOpen(true)} type="button">
					<Menu size={18} />
				</button>
				<Link className="min-w-0 truncate text-lg font-bold" href={`/docs/${props.version}/`}>
					{props.packageName}
				</Link>
				<button aria-label="Search" className={iconButton} onClick={() => setSearchOpen(true)} type="button">
					<Search size={18} />
				</button>
			</div>

			<div
				aria-hidden
				className={cx(
					'fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
					open ? 'opacity-100' : 'pointer-events-none opacity-0',
				)}
				onClick={() => setOpen(false)}
			/>

			<aside
				className={cx(
					'fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[85vw] flex-col bg-sidebar transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0',
					open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
				)}
			>
				<div className="flex flex-col gap-2 p-4">
					<div className="flex items-center justify-between gap-2 p-1">
						<Link className="min-w-0 truncate text-lg font-bold" href={`/docs/${props.version}/`}>
							{props.packageName}
						</Link>
						<div className="flex items-center gap-2">
							<a
								aria-label="GitHub"
								className={iconButton}
								href={`https://github.com/${props.repository}`}
								rel="noopener noreferrer"
								target="_blank"
							>
								<GitHubIcon size={18} />
							</a>
							<ThemeSwitch />
							<button
								aria-label="Close navigation"
								className={cx(iconButton, 'lg:hidden')}
								onClick={() => setOpen(false)}
								type="button"
							>
								<X size={18} />
							</button>
						</div>
					</div>

					<VersionSelect version={props.version} versions={props.versions} />

					<button
						className="flex h-10 w-full items-center gap-2 rounded-md bg-black/5 px-3 text-[15px] text-muted transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
						onClick={() => setSearchOpen(true)}
						type="button"
					>
						<Search size={16} />
						<span className="grow text-left">Search...</span>
						<kbd className="font-sans text-xs">Ctrl K</kbd>
					</button>
				</div>

				<nav className="grow overflow-y-auto px-4 pb-6 [scrollbar-width:thin]" ref={navRef}>
					{props.sections.map((section) => (
						<NavGroup key={section.title} pathname={pathname} section={section} />
					))}
				</nav>
			</aside>

			<SearchDialog onOpenChange={setSearchOpen} open={searchOpen} version={props.version} />
		</>
	);
}

function NavGroup({ section, pathname }: { readonly section: NavSection; readonly pathname: string }) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div className="mt-2">
			<button
				aria-expanded={expanded}
				className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[15px] font-semibold hover:bg-hover"
				onClick={() => setExpanded((value) => !value)}
				type="button"
			>
				{section.title}
				<ChevronDown className={cx('transition-transform duration-200', !expanded && '-rotate-90')} size={18} />
			</button>
			{/* Height animation: a grid row that goes from 1fr to 0fr */}
			<div className={cx('grid transition-[grid-template-rows,opacity] duration-300 ease-out', expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
				<ul className="mt-1 flex min-h-0 flex-col gap-0.5 overflow-hidden" inert={!expanded}>
					{section.items.map((item) => {
						const active = pathname === item.href || pathname === item.href.replace(/\/$/, '');

						return (
							<li key={item.href}>
								<Link
									aria-current={active ? 'page' : undefined}
									className={cx(
										'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[15px] transition-[background-color,color,transform] duration-150 active:scale-[0.98]',
										active
											? 'bg-active font-medium text-neutral-900 dark:text-neutral-50'
											: 'text-muted hover:bg-hover hover:text-neutral-900 dark:hover:text-neutral-50',
									)}
									href={item.href}
									title={item.name}
								>
									<KindBadge kind={item.kind} />
									<span className="truncate">{item.name}</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

/** Version select: a dropdown that unfolds with an animation, works with the mouse and the keyboard. */
function VersionSelect({ version, versions }: { readonly version: string; readonly versions: string[] }) {
	const router = useRouter();
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [focused, setFocused] = useState(() => Math.max(versions.indexOf(version), 0));
	const rootRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		if (!open) return;

		setFocused(Math.max(versions.indexOf(version), 0));
		listRef.current?.focus();

		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};

		document.addEventListener('pointerdown', onPointerDown);

		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open, version, versions]);

	const choose = (next: string) => {
		setOpen(false);
		buttonRef.current?.focus();
		// Keep the same page in the other version when it exists there, the 404 page links back otherwise
		if (next !== version) router.push(pathname.replace(/^\/docs\/[^/]+/, `/docs/${next}`));
	};

	return (
		<div className="relative" ref={rootRef}>
			<button
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label={`Version: ${version}`}
				className={cx(field, 'cursor-pointer', open && 'border-blurple dark:border-blurple')}
				onClick={() => setOpen((value) => !value)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
						event.preventDefault();
						setOpen(true);
					}
				}}
				ref={buttonRef}
				type="button"
			>
				<span className="truncate">{version}</span>
				<ChevronDown className={cx('shrink-0 transition-transform duration-300', open && 'rotate-180')} size={18} />
			</button>

			<ul
				aria-activedescendant={open ? `version-${versions[focused]}` : undefined}
				className={cx(
					'version-menu absolute inset-x-0 top-full z-20 mt-2 max-h-72 origin-top overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-xl outline-none dark:bg-panel',
					open ? 'version-menu-open' : 'pointer-events-none',
				)}
				inert={!open}
				onKeyDown={(event) => {
					if (event.key === 'Escape' || event.key === 'Tab') {
						setOpen(false);
						buttonRef.current?.focus();
					} else if (event.key === 'ArrowDown') {
						event.preventDefault();
						setFocused((index) => (index + 1) % versions.length);
					} else if (event.key === 'ArrowUp') {
						event.preventDefault();
						setFocused((index) => (index - 1 + versions.length) % versions.length);
					} else if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						choose(versions[focused]!);
					}
				}}
				ref={listRef}
				role="listbox"
				tabIndex={-1}
			>
				{versions.map((item, index) => (
					<li
						aria-selected={item === version}
						className={cx(
							'version-option flex cursor-pointer items-center justify-between rounded px-3 py-2 text-[15px] transition-colors duration-150',
							index === focused ? 'bg-hover' : '',
							item === version ? 'font-semibold text-blurple dark:text-blurple-light' : '',
						)}
						id={`version-${item}`}
						key={item}
						onClick={() => choose(item)}
						onMouseEnter={() => setFocused(index)}
						role="option"
						style={{ '--i': index } as CSSProperties}
					>
						{item}
						{item === version ? <Check size={16} /> : null}
					</li>
				))}
			</ul>
		</div>
	);
}
