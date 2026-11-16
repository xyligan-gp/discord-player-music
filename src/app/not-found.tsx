import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
			<h1 className="text-6xl font-black">404</h1>
			<p className="text-lg text-muted">This page does not exist, or it is not in this version of the documentation.</p>
			<Link className="rounded-md bg-blurple px-5 py-3 font-semibold text-white hover:bg-blurple/85" href="/docs/">
				Open the documentation
			</Link>
		</div>
	);
}
