import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
			? {
					id: locals.user.id,
					username: locals.user.username,
					avatarUrl: locals.user.avatarUrl,
					bio: locals.user.bio,
					isBetaApproved: locals.user.isBetaApproved
				}
			: null
	};
};
