'use client';

import { useEffect } from 'react';

/** A static site has no server redirects, so the page moves on by itself (and shows a link meanwhile). */
export function Redirect({ to }: { readonly to: string }) {
	useEffect(() => {
		// Old hash links are handled by LegacyRedirect
		if (!window.location.hash.startsWith('#/')) window.location.replace(to);
	}, [to]);

	return (
		<p className="p-8 text-center text-muted">
			Redirecting to{' '}
			<a className="text-blurple underline" href={to}>
				{to}
			</a>
			...
		</p>
	);
}
