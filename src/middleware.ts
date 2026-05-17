import { defineMiddleware } from "astro:middleware";

// EmDash hardcodes /_emdash/api/media/file/ without respecting Astro's base config.
// When served at nicecatalogs.com/blog*, the browser resolves these as
// nicecatalogs.com/_emdash/api/media/file/... which misses the /blog* worker route.
// This middleware rewrites those paths in HTML responses so images load correctly.
export const onRequest = defineMiddleware(async (_context, next) => {
	const response = await next();

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/html")) {
		return response;
	}

	const html = await response.text();
	// Negative lookbehind ensures we don't double-rewrite already-prefixed paths.
	const rewritten = html.replace(
		/(?<!blog)\/_emdash\/api\/media\/file\//g,
		"/blog/_emdash/api/media/file/",
	);

	return new Response(rewritten, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
});
