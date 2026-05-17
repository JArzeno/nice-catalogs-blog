import { defineMiddleware } from "astro:middleware";

// Matches /_emdash/api/media/file/<key> with optional /blog prefix.
const MEDIA_FILE_RE = /^(?:\/blog)?\/_emdash\/api\/media\/file\/(.+)$/;

// EmDash has two bugs when Astro's base: "/blog" is set:
//
// 1. EmDashImage hardcodes /_emdash/api/media/file/ without the /blog prefix,
//    so browsers request nicecatalogs.com/_emdash/... which misses the /blog* route.
//    Fix: rewrite those paths in HTML responses.
//
// 2. EmDash's internal middleware checks url.pathname.startsWith("/_emdash") but
//    with base: "/blog" the path is /blog/_emdash/..., so isEmDashRoute = false.
//    The middleware short-circuits and never calls doInit(), leaving locals.emdash
//    uninitialized. The media API handler then returns "Storage not configured".
//    Fix: serve R2 files directly from this middleware, bypassing EmDash entirely.
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = new URL(context.request.url);
	const mediaMatch = MEDIA_FILE_RE.exec(pathname);

	if (mediaMatch) {
		const key = mediaMatch[1];
		// Access R2 binding directly via Cloudflare adapter runtime env.
		const env = (context.locals as { runtime?: { env?: { MEDIA?: R2Bucket } } }).runtime?.env;
		const bucket = env?.MEDIA;

		if (!bucket) {
			return new Response(JSON.stringify({ error: { code: "NOT_CONFIGURED", message: "Storage not configured" } }), {
				status: 500,
				headers: { "content-type": "application/json" },
			});
		}

		const object = await bucket.get(key);
		if (!object || !("body" in object) || !object.body) {
			return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "File not found" } }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		}

		const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
		return new Response(object.body, {
			status: 200,
			headers: {
				"content-type": contentType,
				"cache-control": "public, max-age=31536000, immutable",
				etag: object.etag,
			},
		});
	}

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
