const TRAILING_SLASH_RE = /\/+$/;

/** Public origin from Astro's `site` option (e.g. "https://nicecatalogs.com"). */
export const SITE_ORIGIN = new URL(import.meta.env.SITE).origin;

/** Blog root including the Astro `base` (e.g. "https://nicecatalogs.com/blog"). */
export const BLOG_URL = `${SITE_ORIGIN}${import.meta.env.BASE_URL.replace(TRAILING_SLASH_RE, "")}`;

/**
 * Absolute URL for a blog path, e.g. absoluteUrl("/posts/hello") ->
 * "https://nicecatalogs.com/blog/posts/hello". No trailing slash, so the
 * blog root is "https://nicecatalogs.com/blog".
 */
export function absoluteUrl(path = "/"): string {
	const clean = path.replace(TRAILING_SLASH_RE, "");
	return `${BLOG_URL}${clean && !clean.startsWith("/") ? `/${clean}` : clean}`;
}

/** Root-relative blog path, e.g. blogPath("/tag/news") -> "/blog/tag/news". */
export function blogPath(path = "/"): string {
	return `${import.meta.env.BASE_URL.replace(TRAILING_SLASH_RE, "")}${path}`;
}

/**
 * Canonical URL for the current request. Astro's `url.pathname` already
 * includes the `base`, so only the origin comes from `site`.
 */
export function canonicalFor(url: URL): string {
	const pathname = url.pathname.replace(TRAILING_SLASH_RE, "");
	return `${SITE_ORIGIN}${pathname}`;
}
