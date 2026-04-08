import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserByUsername } from '$lib/server/queries/users';
import { getProfileFeed } from '$lib/server/queries/activities';

export const load: PageServerLoad = async ({ params }) => {
	const user = await getUserByUsername(params.username);
	if (!user) throw error(404, 'User not found');

	const { items, nextCursor } = await getProfileFeed(user.id, undefined, 20);

	return {
		profile: {
			username: user.username,
			avatarUrl: user.avatarUrl
		},
		items,
		nextCursor
	};
};
