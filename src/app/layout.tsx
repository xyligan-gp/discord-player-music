import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { PropsWithChildren } from 'react';
import { Providers } from '@/components/Providers';
import { LegacyRedirect } from '@/components/LegacyRedirect';
import './globals.css';

export const metadata: Metadata = {
	metadataBase: new URL('https://dpm.js.org'),
	title: {
		default: 'discord-player-music',
		template: '%s | discord-player-music',
	},
	description: 'A powerful music module for your discord.js bot with lots of features.',
	icons: {
		icon: '/icon-192.png',
		apple: '/apple-touch-icon.png',
	},
	openGraph: {
		siteName: 'discord-player-music',
		type: 'website',
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#f3f3f4' },
		{ media: '(prefers-color-scheme: dark)', color: '#121214' },
	],
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html className={`${GeistSans.variable} ${GeistMono.variable}`} data-scroll-behavior="smooth" lang="en" suppressHydrationWarning>
			<body className="font-sans">
				<Providers>
					<LegacyRedirect />
					{children}
				</Providers>
			</body>
		</html>
	);
}
