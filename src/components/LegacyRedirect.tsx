'use client';

import { useEffect } from 'react';
import { convertOldSiteLink } from '@/lib/links';

/**
 * The old site used hash routing (`/#/docs/discord-player-music/stable/class/Player`).
 * Links to it are still in READMEs, issues and Discord messages, so they are sent to the new pages.
 */
export function LegacyRedirect() {
	useEffect(() => {
		const { hash } = window.location;

		if (hash.startsWith('#/')) {
			const target = convertOldSiteLink(hash);

			window.location.replace(target ?? '/docs/');
		}
	}, []);

	return null;
}
