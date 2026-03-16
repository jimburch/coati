import type { PageServerLoad } from './$types';
import { getRecentSetups } from '$lib/server/queries/setups';

export const load: PageServerLoad = async () => {
	const setups = await getRecentSetups(50);
	return { setups };
};
