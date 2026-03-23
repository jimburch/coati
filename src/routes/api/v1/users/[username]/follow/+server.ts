import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getUserByUsername } from '$lib/server/queries/users';
import { isFollowing, toggleFollow } from '$lib/server/queries/follows';

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

	const alreadyFollowing = await isFollowing(user.id, target.id);

	if (!alreadyFollowing) {
		await toggleFollow(user.id, target.id);
	}

	const updated = await getUserByUsername(event.params.username);
	return success({ following: true, followersCount: updated!.followersCount });
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

	const alreadyFollowing = await isFollowing(user.id, target.id);

	if (alreadyFollowing) {
		await toggleFollow(user.id, target.id);
	}

	const updated = await getUserByUsername(event.params.username);
	return success({ following: false, followersCount: updated!.followersCount });
};
