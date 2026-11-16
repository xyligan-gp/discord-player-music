export function cx(...classes: (string | false | null | undefined)[]) {
	return classes.filter(Boolean).join(' ');
}

export const iconButton =
	'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-colors hover:bg-accent-hover';

export const field =
	'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-surface px-3 text-left text-[15px] transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-transparent dark:hover:border-neutral-500';

/** Letter and color of the round badge in front of an item, like on discord.js.org. */
export const KIND_BADGES = {
	class: { letter: 'C', className: 'text-badge-class border-badge-class/40 bg-badge-class/10' },
	typedef: { letter: 'T', className: 'text-badge-typedef border-badge-typedef/40 bg-badge-typedef/10' },
	enum: { letter: 'E', className: 'text-badge-enum border-badge-enum/40 bg-badge-enum/10' },
	guide: { letter: 'G', className: 'text-badge-guide border-badge-guide/40 bg-badge-guide/10' },
	method: { letter: 'M', className: 'text-badge-method border-badge-method/40 bg-badge-method/10' },
	property: { letter: 'P', className: 'text-badge-property border-badge-property/40 bg-badge-property/10' },
	event: { letter: 'V', className: 'text-badge-event border-badge-event/40 bg-badge-event/10' },
} as const;

export type BadgeKind = keyof typeof KIND_BADGES;
