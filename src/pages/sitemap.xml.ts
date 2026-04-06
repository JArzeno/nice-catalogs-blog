import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

const SITE_ORIGIN = "https://nicecatalogs.com";
const BLOG_BASE = "/blog";

export const GET: APIRoute = async () => {
	const baseUrl = `${SITE_ORIGIN}${BLOG_BASE}`;

	const [{ entries: posts }, { entries: pages }] = await Promise.all([
		getEmDashCollection("posts", {
			orderBy: { published_at: "desc" },
		}),
		getEmDashCollection("pages"),
	]);

	const staticUrls = [
		{ loc: baseUrl, priority: "1.0" },
		{ loc: `${baseUrl}/posts`, priority: "0.8" },
	];

	const postUrls = posts
		.filter((post) => post.data.publishedAt)
		.map((post) => ({
			loc: `${baseUrl}/posts/${post.id}`,
			lastmod: post.data.updatedAt || post.data.publishedAt,
			priority: "0.7",
		}));

	const pageUrls = pages.map((page) => ({
		loc: `${baseUrl}/pages/${page.id}`,
		lastmod: page.data.updatedAt,
		priority: "0.5",
	}));

	const urls = [
		...staticUrls.map(
			(u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <priority>${u.priority}</priority>
  </url>`
		),
		...postUrls.map(
			(u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod instanceof Date ? u.lastmod.toISOString() : u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`
		),
		...pageUrls.map(
			(u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod instanceof Date ? u.lastmod.toISOString() : u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`
		),
	].join("\n");

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
