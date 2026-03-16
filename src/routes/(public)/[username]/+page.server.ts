import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserByUsername } from '$lib/server/queries/users';
import { getSetupsByUserId, getToolsForSetups } from '$lib/server/queries/setups';

export const load: PageServerLoad = async ({ params }) => {
	const user = await getUserByUsername(params.username);
	if (!user) throw error(404, 'User not found');

	const rawSetups = await getSetupsByUserId(user.id);
	const toolsMap = await getToolsForSetups(rawSetups.map((s) => s.id));

	const setups = rawSetups.map((s) => ({
		...s,
		tools: toolsMap[s.id] ?? [],
		ownerAvatarUrl: user.avatarUrl
	}));

	return { profile: user, setups };
};
