'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { cx, iconButton } from './styles';

/**
 * Theme button. The new theme spreads from the button as a circle (View Transitions API);
 * browsers without it and visitors who turned animations off get the new theme at once.
 */
export function ThemeSwitch() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const isDark = mounted && resolvedTheme === 'dark';

	const toggle = (event: MouseEvent<HTMLButtonElement>) => {
		const next = isDark ? 'light' : 'dark';
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!document.startViewTransition || reduceMotion) {
			setTheme(next);
			return;
		}

		const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
		const x = left + width / 2;
		const y = top + height / 2;
		const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

		const transition = document.startViewTransition(() => {
			flushSync(() => setTheme(next));
		});

		void transition.ready.then(() => {
			document.documentElement.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
				{ duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
			);
		});
	};

	return (
		<button
			aria-label={isDark ? 'Switch to the light theme' : 'Switch to the dark theme'}
			className={cx(iconButton, 'overflow-hidden')}
			onClick={toggle}
			title="Toggle theme"
			type="button"
		>
			<span className="relative size-[18px]">
				<Sun className={cx('theme-icon absolute inset-0', isDark ? 'theme-icon-in' : 'theme-icon-out')} size={18} />
				<Moon className={cx('theme-icon absolute inset-0', isDark ? 'theme-icon-out' : 'theme-icon-in')} size={18} />
			</span>
		</button>
	);
}
