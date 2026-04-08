import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getUserByUsername } from '$lib/server/queries/users';
import { setFollow } from '$lib/server/queries/follows';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const target = await getUserByUsername(event.params.username);
	if (!target) {
		return error('User not found', 'NOT_FOUND', 404);
	}

	if (target.id === user.id) {
		return error('Cannot follow yourself', 'SELF_FOLLOW', 400);
	}

	const result = await setFollow(user.id, target.id, true);
	return success({ following: result.following, followersCount: result.followersCount });
};

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const target = await getUserByUsername(event.params.username);
	if (!target) {
		return error('User not found', 'NOT_FOUND', 404);
	}

	if (target.id === user.id) {
		return error('Cannot follow yourself', 'SELF_FOLLOW', 400);
	}

	const result = await setFollow(user.id, target.id, false);
	return success({ following: result.following, followersCount: result.followersCount });
};
