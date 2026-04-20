import type { PageServerLoad } from './$types';
import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';

export const load: PageServerLoad = async ({ locals }) => {
	const feed = await getBlendedActivityFeed(locals.user!.id, undefined, 20);
	return { feed };
};
