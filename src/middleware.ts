import { defineMiddleware } from "astro:middleware";

const BASE = "/blog";

export const onRequest = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);

	// Strip /blog prefix so Astro routes match
	if (url.pathname.startsWith(BASE)) {
		const newPath = url.pathname.slice(BASE.length) || "/";
		const newUrl = new URL(newPath + url.search, url.origin);
		const response = await next(
			new Request(newUrl, {
				method: context.request.method,
				headers: context.request.headers,
				body: context.request.body,
			})
		);

		// Rewrite asset paths in HTML responses so the browser
		// requests them through /blog/* (which routes to this worker)
		const contentType = response.headers.get("content-type") || "";
		if (contentType.includes("text/html")) {
			const html = await response.text();
			const rewritten = html
				.replaceAll('="/_astro/', '="/blog/_astro/')
				.replaceAll('="/_emdash/', '="/blog/_emdash/');
			return new Response(rewritten, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		}

		return response;
	}

	return next();
});
