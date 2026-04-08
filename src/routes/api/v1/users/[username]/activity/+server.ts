import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getUserByUsername } from '$lib/server/queries/users';
import { getProfileFeed } from '$lib/server/queries/activities';

export const GET: RequestHandler = async (event) => {
	const user = await getUserByUsername(event.params.username);
	if (!user) {
		return error('User not found', 'NOT_FOUND', 404);
	}

	const cursorParam = event.url.searchParams.get('cursor');
	let cursor: Date | undefined;
	if (cursorParam) {
		const parsed = new Date(cursorParam);
		if (isNaN(parsed.getTime())) {
			return error('Invalid cursor value', 'INVALID_CURSOR', 400);
		}
		cursor = parsed;
	}

	const feed = await getProfileFeed(user.id, cursor, 10);
	return success(feed);
};
