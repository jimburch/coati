import type { RequestHandler } from './$types';
import { BADGE_AVAILABLE, BADGE_UNAVAILABLE } from '$lib/server/badge';
import { getBadge, setBadge } from '$lib/server/badge-cache';
import { getTeamBadgeState } from '$lib/server/queries/badgeState';

const CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

export const GET: RequestHandler = async ({ params }) => {
	const { teamSlug, setupSlug } = params;
	const cacheKey = `team:${teamSlug}/${setupSlug}`;

	let svg = getBadge(cacheKey);

	if (svg === undefined) {
		const state = await getTeamBadgeState(teamSlug, setupSlug);
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
