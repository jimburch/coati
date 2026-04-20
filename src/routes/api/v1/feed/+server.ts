import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const cursorParam = event.url.searchParams.get('cursor');
	let cursor: Date | undefined;
	if (cursorParam) {
		const parsed = new Date(cursorParam);
		if (isNaN(parsed.getTime())) {
			return error('Invalid cursor value', 'INVALID_CURSOR', 400);
		}
		cursor = parsed;
	}

	const feed = await getBlendedActivityFeed(user.id, cursor, 20);
	return success(feed);
};
