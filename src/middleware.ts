import { defineMiddleware } from "astro:middleware";
// Astro 6 removed Astro.locals.runtime.env; bindings now come from this module.
import { env } from "cloudflare:workers";

// Matches /_emdash/api/media/file/<key> with optional /blog prefix.
const MEDIA_FILE_RE = /^(?:\/blog)?\/_emdash\/api\/media\/file\/(.+)$/;
// EmDash admin and API routes, with or without the /blog prefix.
const EMDASH_ROUTE_RE = /^(?:\/blog)?\/_emdash(?:\/|$)/;
const REPEATED_SLASHES_RE = /\/{2,}/g;
const TRAILING_SLASHES_RE = /\/+$/;
const NO_STORE_RE = /private|no-store/i;

// How long anonymous HTML stays in the edge cache (1 hour).
const HTML_CACHE_TTL_SECONDS = 3600;

// Stale-while-revalidate: allow serving stale content for up to 24 hours
// while fetching a fresh copy in the background.
const HTML_SWR_SECONDS = 86400;

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
	const url = new URL(context.request.url);
	const { pathname } = url;
	const isGet = context.request.method === "GET";

	// Normalize trailing slashes: redirect /blog/ to /blog. Repeated slashes are
	// collapsed so a path like "//evil.com/" can't become an off-site redirect.
	if (isGet && pathname.length > 1 && pathname.endsWith("/") && !EMDASH_ROUTE_RE.test(pathname)) {
		const target = pathname.replace(REPEATED_SLASHES_RE, "/").replace(TRAILING_SLASHES_RE, "") || "/";
		return Response.redirect(new URL(target + url.search, url.origin), 301);
	}

	const mediaMatch = MEDIA_FILE_RE.exec(pathname);

	if (mediaMatch) {
		const key = mediaMatch[1];
		// Access the R2 binding directly from the Workers runtime env.
		const bucket = env.MEDIA;

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

	// Edge-cache public pages for anonymous visitors (Workers Cache API).
	// Logged-in users (EmDash's auth middleware has already set locals.user),
	// admin/API routes and any URL with a query string (search, preview and
	// edit links) always render fresh and are never stored.
	const cache =
		!import.meta.env.DEV &&
		isGet &&
		!url.search &&
		!EMDASH_ROUTE_RE.test(pathname) &&
		!context.locals.user
			? // The DOM lib typing of `caches` (used by astro check) lacks Workers' `default` cache.
				(caches as unknown as { default: Cache }).default
			: null;
	const cacheKey = new Request(url.toString());

	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) return cached;
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

	const result = new Response(rewritten, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	// Only store successful pages that are the same for every visitor.
	if (
		cache &&
		response.status === 200 &&
		!response.headers.has("set-cookie") &&
		!NO_STORE_RE.test(response.headers.get("cache-control") ?? "")
	) {
		// Use Cloudflare-CDN-Cache-Control for edge, keep browser cache short.
		// This prevents Cloudflare's Browser Cache TTL setting from overriding
		// the browser cache directive.
		result.headers.set(
			"Cache-Control", 
			`public, max-age=60`
		);
		result.headers.set(
			"Cloudflare-CDN-Cache-Control",
			`max-age=${HTML_CACHE_TTL_SECONDS}, stale-while-revalidate=${HTML_SWR_SECONDS}`
		);
		context.locals.cfContext.waitUntil(cache.put(cacheKey, result.clone()));
	}

	return result;
});
