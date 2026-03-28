import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAllUsersWithFeedbackCount, setUserBetaApproval } from '$lib/server/queries/admin';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login/github');
	}
	if (!locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const search = url.searchParams.get('q') || undefined;
	const users = await getAllUsersWithFeedbackCount(search);

	return { users, search: search ?? '' };
};

export const actions: Actions = {
	toggleBeta: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login/github');
		}
		if (!locals.user.isAdmin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const approved = formData.get('approved') === 'true';

		if (!userId) {
			return fail(400, { error: 'Missing userId' });
		}

		await setUserBetaApproval(userId, approved);
		return { success: true };
	}
};
