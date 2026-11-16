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
	description: 'Play music in your discord.js bot in a few lines of code: YouTube search and playback, queues, loops, audio filters, lyrics and autoplay, with a fully typed, promise based API.',
	icons: {
		icon: '/icon-192.png',
		apple: '/apple-touch-icon.png',
	},
	openGraph: {
		siteName: 'discord-player-music',
		type: 'website',
		url: 'https://dpm.js.org',
		title: '🎶 Discord Player Music',
		description: 'Play music in your discord.js bot in a few lines of code: YouTube search and playback, queues, loops, audio filters, lyrics and autoplay, with a fully typed, promise based API.',
		images: [{ url: '/icon-192.png', width: 192, height: 192, alt: 'Discord Player Music' }],
	},
	twitter: {
		card: 'summary',
		title: '🎶 Discord Player Music',
		images: ['/icon-192.png'],
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
