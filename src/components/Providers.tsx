'use client';

import { ThemeProvider } from 'next-themes';
import { useEffect, type PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
	// Smooth scrolling only after the first load (see globals.css)
	useEffect(() => {
		const timer = setTimeout(() => document.documentElement.classList.add('smooth-scroll'), 1000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			{children}
		</ThemeProvider>
	);
}
