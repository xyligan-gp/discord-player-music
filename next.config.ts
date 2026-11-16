import type { NextConfig } from 'next';

const config: NextConfig = {
	// A fully static site: GitHub Pages serves the `out` folder.
	output: 'export',
	trailingSlash: true,
	images: { unoptimized: true },
	reactStrictMode: true,
	// Do not write AGENTS.md into the folder on `next dev`
	agentRules: false,
};

export default config;
