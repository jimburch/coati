import type { PageServerLoad } from './$types';
import { getRecentSetups } from '$lib/server/queries/setups';

export const load: PageServerLoad = async () => {
	const recentSetups = await getRecentSetups(12);
	return { recentSetups };
};
