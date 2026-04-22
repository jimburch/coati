import type { RequestHandler } from './$types';
import { BADGE_AVAILABLE, BADGE_UNAVAILABLE } from '$lib/server/badge';
import { getBadge, setBadge } from '$lib/server/badge-cache';
import { getBadgeState } from '$lib/server/queries/badgeState';

const CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

export const GET: RequestHandler = async ({ params }) => {
	const { username, slug } = params;
	const cacheKey = `${username}/${slug}`;

	let svg = getBadge(cacheKey);

	if (svg === undefined) {
		const state = await getBadgeState(username, slug);
		svg = state === 'available' ? BADGE_AVAILABLE : BADGE_UNAVAILABLE;
		setBadge(cacheKey, svg);
	}

	return new Response(svg, {
		status: 200,
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': CACHE_CONTROL
		}
	});
};
