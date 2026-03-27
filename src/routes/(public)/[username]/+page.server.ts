import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserByUsername } from '$lib/server/queries/users';
import { getSetupsByUserId, getAgentsForSetups } from '$lib/server/queries/setups';
import { isFollowing, setFollow } from '$lib/server/queries/follows';
import { getProfileFeed } from '$lib/server/queries/activities';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await getUserByUsername(params.username);
	if (!user) throw error(404, 'User not found');

	const rawSetups = await getSetupsByUserId(user.id);
	const agentsMap = await getAgentsForSetups(rawSetups.map((s) => s.id));

	const setups = rawSetups.map((s) => ({
		...s,
		agents: agentsMap[s.id] ?? [],
		ownerAvatarUrl: user.avatarUrl
	}));

	const currentUserFollowing =
		locals.user && locals.user.id !== user.id ? await isFollowing(locals.user.id, user.id) : false;

	const { items: activityItems } = await getProfileFeed(user.id, undefined, 5);

	return {
		profile: user,
		setups,
		isFollowing: currentUserFollowing,
		currentUserId: locals.user?.id ?? null,
		activityItems
	};
};

export const actions: Actions = {
	follow: async (event) => {
		const { locals, params } = event;
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const targetUser = await getUserByUsername(params.username);
		if (!targetUser) throw error(404, 'User not found');

		if (locals.user.id === targetUser.id) throw error(400, 'Cannot follow yourself');

		const currentlyFollowing = await isFollowing(locals.user.id, targetUser.id);
		const result = await setFollow(locals.user.id, targetUser.id, !currentlyFollowing);
		return { isFollowing: result.following, followersCount: result.followersCount };
	}
};
