import type { PageServerLoad } from './$types';
import { getHomeFeed } from '$lib/server/queries/activities';

export const load: PageServerLoad = async ({ locals }) => {
	const feed = await getHomeFeed(locals.user!.id, undefined, 20);
	return { feed };
};
