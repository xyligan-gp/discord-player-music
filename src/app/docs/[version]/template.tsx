import type { PropsWithChildren } from 'react';

/** A template mounts again on every navigation, so each page appears with a short animation. */
export default function DocsTemplate({ children }: PropsWithChildren) {
	return <div className="page-enter">{children}</div>;
}
