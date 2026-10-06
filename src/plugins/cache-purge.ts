import { definePlugin } from "emdash";

/**
 * Purge Cloudflare edge cache when a post is published or updated.
 * 
 * Requires environment variables:
 * - CLOUDFLARE_ZONE_ID: Cloudflare zone ID for nicecatalogs.com
 * - CLOUDFLARE_API_TOKEN: API token with Cache Purge permission
 * 
 * The token needs the "Zone.Cache Purge" permission for the zone.
 */
export function createPlugin() {
	return definePlugin({
		id: "cache-purge",
		version: "1.0.0",
		hooks: {
			"content:after-publish": async ({ entry, env }) => {
				if (entry.collection !== "posts") return;
				await purgePost(entry.slug, env);
			},
			"content:after-update": async ({ entry, env }) => {
				if (entry.collection !== "posts") return;
				await purgePost(entry.slug, env);
			},
		},
	});
}

async function purgePost(slug: string, env: Record<string, unknown>): Promise<void> {
	const zoneId = env.CLOUDFLARE_ZONE_ID;
	const apiToken = env.CLOUDFLARE_API_TOKEN;

	if (typeof zoneId !== "string" || typeof apiToken !== "string") {
		console.warn(
			"[cache-purge] Skipping cache purge: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN " +
			"environment variables must be set. Set them in the Cloudflare dashboard " +
			"(Workers & Pages > [project] > Settings > Variables)."
		);
		return;
	}

	const urls = [
		`https://nicecatalogs.com/blog`,
		`https://nicecatalogs.com/blog/posts`,
		`https://nicecatalogs.com/blog/posts/${slug}`,
	];

	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
			{
				method: "POST",
				headers: {
					"Authorization": `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ files: urls }),
			}
		);

		if (!response.ok) {
			const text = await response.text();
			console.error(`[cache-purge] Failed to purge cache for ${slug}: ${response.status} ${text}`);
		} else {
			console.log(`[cache-purge] Successfully purged cache for post ${slug}`);
		}
	} catch (error) {
		console.error(`[cache-purge] Error purging cache for ${slug}:`, error);
	}
}
