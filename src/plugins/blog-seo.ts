import { definePlugin } from "emdash";
import { cleanJsonLd } from "emdash/page";

import { PUBLISHER_LOGO, SITE_NAME, SITE_ORIGIN } from "../utils/site";

const HEADLINE_MAX_LENGTH = 110;

/**
 * Replaces EmDash's default BlogPosting JSON-LD with a complete one
 * (author, publisher logo, image, inLanguage).
 *
 * EmDashHead merges plugin metadata ahead of its own and keeps the first
 * JSON-LD block per id, so returning id "primary" here replaces the built-in
 * block instead of adding a second BlogPosting. Output is serialized by
 * EmDash's safeJsonLdSerialize.
 */
export function createPlugin() {
	return definePlugin({
		id: "blog-seo",
		version: "1.0.0",
		hooks: {
			"page:metadata": async ({ page }) => {
				if (page.pageType !== "article" || !page.canonical) return null;

				// Strip "| Nice Catalogs" from title if present to get bare headline
				let title = page.pageTitle ?? page.title ?? "";
				const brandSuffix = ` | ${SITE_NAME}`;
				if (title.endsWith(brandSuffix)) {
					title = title.slice(0, -brandSuffix.length);
				}
				
				const headline =
					title.length > HEADLINE_MAX_LENGTH ? `${title.slice(0, HEADLINE_MAX_LENGTH - 3)}...` : title;
				const image = page.seo?.ogImage || page.image;
				const { publishedTime, modifiedTime, author } = page.articleMeta ?? {};

				return {
					kind: "jsonld",
					id: "primary",
					graph: cleanJsonLd({
						"@context": "https://schema.org",
						"@type": "BlogPosting",
						headline,
						description: page.seo?.ogDescription || page.description,
						image: image ? [image] : undefined,
						url: page.canonical,
						datePublished: publishedTime || undefined,
						dateModified: modifiedTime || publishedTime || undefined,
						inLanguage: page.locale,
						author: author ? { "@type": "Person", name: author, url: SITE_ORIGIN } : undefined,
					publisher: {
						"@type": "Organization",
						"@id": `${SITE_ORIGIN}/#organization`,
						name: SITE_NAME,
						url: SITE_ORIGIN,
						logo: {
							"@type": "ImageObject",
							url: PUBLISHER_LOGO,
							width: 512,
							height: 512,
						},
					},
						mainEntityOfPage: { "@type": "WebPage", "@id": page.canonical },
					}),
				};
			},
		},
	});
}
