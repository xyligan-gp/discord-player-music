import { cx, KIND_BADGES, type BadgeKind } from './styles';

export function KindBadge({ kind, size = 'sm' }: { readonly kind: BadgeKind; readonly size?: 'sm' | 'lg' }) {
	const badge = KIND_BADGES[kind];

	return (
		<span
			aria-hidden
			className={cx(
				'inline-flex shrink-0 items-center justify-center rounded-full border font-sans font-semibold',
				size === 'sm' ? 'size-5 text-[11px]' : 'size-8 text-sm',
				badge.className,
			)}
		>
			{badge.letter}
		</span>
	);
}
