import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserByUsername, updateUserProfile } from '$lib/server/queries/users';
import {
	getSetupsByUserId,
	getAgentsForSetups,
	getStarredSetupsByUserId
} from '$lib/server/queries/setups';
import { isFollowing, setFollow } from '$lib/server/queries/follows';
import { getProfileFeed } from '$lib/server/queries/activities';
import { updateProfileSchema } from '$lib/types';

export type ProfileTab = 'setups' | 'starred' | 'activity';

function parseTab(param: string | null): ProfileTab {
	if (param === 'starred' || param === 'activity') return param;
	return 'setups';
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = await getUserByUsername(params.username);
	if (!user) throw error(404, 'User not found');

	const tab = parseTab(url.searchParams.get('tab'));

	const currentUserFollowing =
		locals.user && locals.user.id !== user.id ? await isFollowing(locals.user.id, user.id) : false;

	let setups: {
		id: string;
		name: string;
		slug: string;
		description: string;
		starsCount: number;
		clonesCount: number;
		updatedAt: Date;
		ownerAvatarUrl?: string;
		agents: { id: string; displayName: string; slug: string }[];
	}[] = [];

	let starredSetups: {
		id: string;
		name: string;
		slug: string;
		description: string;
		starsCount: number;
		clonesCount: number;
		updatedAt: Date;
		ownerUsername: string;
		ownerAvatarUrl?: string;
		agents: { id: string; displayName: string; slug: string }[];
	}[] = [];

	let activityItems: Awaited<ReturnType<typeof getProfileFeed>>['items'] = [];

	if (tab === 'setups') {
		const rawSetups = await getSetupsByUserId(user.id);
		const agentsMap = await getAgentsForSetups(rawSetups.map((s) => s.id));
		setups = rawSetups.map((s) => ({
			...s,
			agents: agentsMap[s.id] ?? [],
			ownerAvatarUrl: user.avatarUrl ?? undefined
		}));
	} else if (tab === 'starred') {
		const rawStarred = await getStarredSetupsByUserId(user.id);
		const agentsMap = await getAgentsForSetups(rawStarred.map((s) => s.id));
		starredSetups = rawStarred.map((s) => ({
			...s,
			ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
			agents: agentsMap[s.id] ?? []
		}));
	} else {
		const { items } = await getProfileFeed(user.id, undefined, 20);
		activityItems = items;
	}

	return {
		profile: user,
		tab,
		setups,
		starredSetups,
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
	},

	updateProfile: async ({ request, locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const targetUser = await getUserByUsername(params.username);
		if (!targetUser) throw error(404, 'User not found');

		if (locals.user.id !== targetUser.id) throw error(403, 'Forbidden');

		const formData = await request.formData();
		const raw = {
			name: formData.get('name') as string,
			bio: formData.get('bio') as string,
			websiteUrl: formData.get('websiteUrl') as string,
			location: formData.get('location') as string
		};

		const parsed = updateProfileSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				updateProfileError: parsed.error.issues[0].message,
				fields: raw
			});
		}

		await updateUserProfile(locals.user.id, parsed.data);
		return { updateProfileSuccess: true };
	}
};
