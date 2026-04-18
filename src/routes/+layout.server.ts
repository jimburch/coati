import type { LayoutServerLoad } from './$types';
import { getPendingInvites } from '$lib/server/queries/teams';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null };
	}

	const pendingInvites = await getPendingInvites(locals.user.id);

	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
			avatarUrl: locals.user.avatarUrl,
			bio: locals.user.bio,
			isBetaApproved: locals.user.isBetaApproved,
			isAdmin: locals.user.isAdmin,
			hasBetaFeatures: locals.user.hasBetaFeatures
		},
		pendingInviteCount: pendingInvites.length
	};
};
