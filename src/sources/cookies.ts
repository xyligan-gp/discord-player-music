import { readFile } from 'node:fs/promises';

/**
 * One cookie of a cookies file
 *
 * @private
 */
export interface Cookie {
    domain: string;
    name: string;
    value: string;
    expires: number;
}

/**
 * Parses a cookies file in the Netscape format (the format of `cookies.txt` that yt-dlp and browser extensions use):
 * tab separated lines `domain, subdomains flag, path, secure flag, expiration time, name, value`. Lines of HttpOnly cookies start with `#HttpOnly_`.
 *
 * @param {string} text Contents of the file
 *
 * @returns {Array<Cookie>} Cookies
 * @private
 */
export function parseCookies(text: string): Array<Cookie> {
    const cookies: Array<Cookie> = [];

    for(const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.startsWith('#HttpOnly_') ? rawLine.slice('#HttpOnly_'.length) : rawLine;
        if(!line.trim() || line.startsWith('#')) continue;

        const [domain, , , , expires, name, ...value] = line.split('\t');
        if(!domain || !name) continue;

        cookies.push({ domain: domain.toLowerCase(), name, value: value.join('\t'), expires: Number(expires) || 0 });
    }

    return cookies;
}

/**
 * Builds the value of the `Cookie` header for a site: only the cookies of the site (and its parent domains) that did not expire
 *
 * @param {Array<Cookie>} cookies Cookies
 * @param {string} host Site, for example `youtube.com`
 *
 * @returns {string} Header value (`name=value; name2=value2`), empty if there are no cookies for the site
 * @private
 */
export function cookieHeader(cookies: Array<Cookie>, host: string): string {
    const now = Date.now() / 1000;

    return cookies
        .filter(cookie => (cookie.expires === 0 || cookie.expires > now) && (host === cookie.domain.replace(/^\./, '') || host.endsWith(`.${cookie.domain.replace(/^\./, '')}`)))
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
}

/**
 * Reads a cookies file and returns the `Cookie` header value for YouTube
 *
 * @param {string} path Path of the cookies file (Netscape format)
 *
 * @throws {Error} If the file can not be read or has no cookies of youtube.com
 *
 * @returns {Promise<string>} Header value
 * @private
 */
export async function readYouTubeCookies(path: string): Promise<string> {
    let text: string;

    try {
        text = await readFile(path, 'utf-8');
    }catch(error) {
        throw new Error(`Can not read the cookies file '${path}': ${(error as Error).message}`, { cause: error });
    }

    const header = cookieHeader(parseCookies(text), 'youtube.com');
    if(!header) throw new Error(`The cookies file '${path}' has no valid cookies of youtube.com (they may have expired, export them again)`);

    return header;
}
