'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from './styles';

/** Distance (px) the page has to be scrolled before the button appears. */
const SHOW_AFTER = 400;

/** A round "back to top" button: fades in at the bottom right corner after scrolling down. */
export function ScrollToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		let frame = 0;

		const update = () => {
			frame = 0;
			setVisible(window.scrollY > SHOW_AFTER);
		};

		// One state update per animation frame, however fast the scroll events come
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};

		update();
		window.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', onScroll);
			if (frame) cancelAnimationFrame(frame);
		};
	}, []);

	return (
		<button
			aria-hidden={!visible}
			aria-label="Scroll to top"
			className={cx(
				'scroll-top fixed right-4 bottom-4 z-30 inline-flex size-11 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg shadow-black/20 transition-[opacity,translate,scale,background-color] duration-300 ease-out hover:bg-accent-hover sm:right-6 sm:bottom-6',
				visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-75 opacity-0',
			)}
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			tabIndex={visible ? 0 : -1}
			type="button"
		>
			<ArrowUp className="scroll-top-icon" size={20} strokeWidth={2.5} />
		</button>
	);
}
