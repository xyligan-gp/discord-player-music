'use client';

import { useEffect } from 'react';

const COPY_ICON =
	'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_ICON =
	'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

/** Time (ms) the "Copied" state stays on the button. */
const RESET_AFTER = 1800;

async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		// Fallback for insecure contexts and old browsers
		const area = document.createElement('textarea');
		area.value = text;
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.append(area);
		area.select();

		try {
			return document.execCommand('copy');
		} catch {
			return false;
		} finally {
			area.remove();
		}
	}
}

/** Adds an always visible "copy" button to every code block of the markdown pages and the examples. */
export function CopyCode() {
	useEffect(() => {
		const decorate = (root: ParentNode) => {
			for (const pre of root.querySelectorAll<HTMLElement>('pre.shiki:not([data-copy])')) {
				pre.dataset.copy = '';

				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'copy-code';
				button.setAttribute('aria-label', 'Copy code');
				button.innerHTML = `<span class="copy-code-label" aria-live="polite"></span>${COPY_ICON}`;
				pre.append(button);
			}
		};

		const onClick = async (event: MouseEvent) => {
			const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button.copy-code');
			if (!button) return;

			const code = button.parentElement?.querySelector('code');
			if (!code) return;

			const ok = await copyText(code.textContent ?? '');
			const label = button.querySelector('.copy-code-label')!;

			label.textContent = ok ? 'Copied' : 'Failed';
			button.dataset.state = ok ? 'copied' : 'failed';
			button.querySelector('svg')!.outerHTML = ok ? CHECK_ICON : COPY_ICON;

			clearTimeout(Number(button.dataset.timer));
			button.dataset.timer = String(
				window.setTimeout(() => {
					delete button.dataset.state;
					label.textContent = '';
					button.querySelector('svg')!.outerHTML = COPY_ICON;
				}, RESET_AFTER),
			);
		};

		decorate(document);

		// Pages change on navigation without a reload, so new code blocks are decorated as they appear
		let frame = 0;
		const observer = new MutationObserver(() => {
			if (!frame)
				frame = requestAnimationFrame(() => {
					frame = 0;
					decorate(document);
				});
		});
		observer.observe(document.body, { childList: true, subtree: true });
		document.addEventListener('click', onClick);

		return () => {
			observer.disconnect();
			document.removeEventListener('click', onClick);
			if (frame) cancelAnimationFrame(frame);
		};
	}, []);

	return null;
}
