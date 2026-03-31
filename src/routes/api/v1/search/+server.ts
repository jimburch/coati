import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { searchUsers } from '$lib/server/queries/users';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	if (q.length < 2) {
		return error('Query must be at least 2 characters', 'QUERY_TOO_SHORT', 400);
	}

	const [users, setupsResult] = await Promise.all([
		searchUsers(q, 3),
		setupRepo.search({ q, sort: 'newest', page: 1 })
	]);

	const setups = setupsResult.items.slice(0, 5);

	return success({ users, setups });
};
