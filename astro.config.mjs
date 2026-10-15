import { fileURLToPath } from "node:url";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// Site-local plugin: replaces EmDash's BlogPosting JSON-LD (src/plugins/blog-seo.ts)
const blogSeoPlugin = {
	id: "blog-seo",
	version: "1.0.0",
	format: "native",
	entrypoint: fileURLToPath(new URL("./src/plugins/blog-seo.ts", import.meta.url)),
};

// Site-local plugin: purges Cloudflare cache on post publish/update (src/plugins/cache-purge.ts)
const cachePurgePlugin = {
	id: "cache-purge",
	version: "1.0.0",
	format: "native",
	entrypoint: fileURLToPath(new URL("./src/plugins/cache-purge.ts", import.meta.url)),
};

// Build-time cache version: Workers Builds sets WORKERS_CI_COMMIT_SHA,
// Pages sets CF_PAGES_COMMIT_SHA, otherwise use timestamp.
const CACHE_VERSION = 
	process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 8) ||
	process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8) ||
	Date.now().toString();

export default defineConfig({
	output: "server",
	site: "https://nicecatalogs.com",
	base: "/blog",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		define: {
			__CACHE_VERSION__: JSON.stringify(CACHE_VERSION),
		},
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [formsPlugin(), blogSeoPlugin, cachePurgePlugin],
		}),
	],
	devToolbar: { enabled: false },
});
