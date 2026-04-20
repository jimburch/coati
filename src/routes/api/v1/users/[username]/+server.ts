import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getUserByUsername } from '$lib/server/queries/users';

export const GET: RequestHandler = async (event) => {
	const user = await getUserByUsername(event.params.username);
	if (!user) {
		return error('User not found', 'NOT_FOUND', 404);
	}
	return success(user);
};
