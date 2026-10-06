const TRAILING_SLASH_RE = /\/+$/;
const ABSOLUTE_HTTP_URL_RE = /^https?:\/\//i;

/** Brand name used in page titles and structured data. */
export const SITE_NAME = "Nice Catalogs";

/** Public origin from Astro's `site` option (e.g. "https://nicecatalogs.com"). */
export const SITE_ORIGIN = new URL(import.meta.env.SITE).origin;

/** Blog root including the Astro `base` (e.g. "https://nicecatalogs.com/blog"). */
export const BLOG_URL = `${SITE_ORIGIN}${import.meta.env.BASE_URL.replace(TRAILING_SLASH_RE, "")}`;

/**
 * Last-resort OG image, used only when neither the page nor the admin's
 * Settings → SEO default OG image provides one.
 */
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

/**
 * Organization logo for structured data. Same URL as the main site's
 * Organization schema (`https://nicecatalogs.com/#organization`).
 * 512x512 as required by Google (minimum 112x112).
 */
export const PUBLISHER_LOGO = `${SITE_ORIGIN}/logo-512.png`;

/**
 * Absolute URL for an EmDash media URL. EmDash builds media paths without
 * the Astro `base` ("/_emdash/api/media/file/…"), but they are served under
 * /blog. Returns null for anything that isn't an http(s) URL or a
 * root-relative path.
 */
export function absoluteMediaUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (ABSOLUTE_HTTP_URL_RE.test(url)) return url;
	if (!url.startsWith("/") || url.startsWith("//")) return null;
	return url.startsWith("/_emdash/") ? absoluteUrl(url) : `${SITE_ORIGIN}${url}`;
}

/** Page title with the brand appended unless it already mentions it. */
export function withBrand(title: string): string {
	return title.toLowerCase().includes(SITE_NAME.toLowerCase()) ? title : `${title} | ${SITE_NAME}`;
}

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
