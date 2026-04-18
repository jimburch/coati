import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/guards';
import { getPendingInvites, acceptInvite, declineInvite } from '$lib/server/queries/teams';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);
	const invites = await getPendingInvites(user.id);
	return { invites };
};

export const actions: Actions = {
	accept: async (event) => {
		if (!event.locals.user) throw redirect(302, '/auth/login/github');
		const user = event.locals.user;

		const formData = await event.request.formData();
		const token = formData.get('token') as string;
		if (!token) return fail(400, { error: 'Missing token' });

		const result = await acceptInvite(token, user.id);
		if (!result.ok) {
			return fail(result.code === 'NOT_FOUND' ? 404 : 409, { error: result.error });
		}

		return { acceptSuccess: true };
	},

	decline: async (event) => {
		if (!event.locals.user) throw redirect(302, '/auth/login/github');
		const user = event.locals.user;

		const formData = await event.request.formData();
		const token = formData.get('token') as string;
		if (!token) return fail(400, { error: 'Missing token' });

		const result = await declineInvite(token, user.id);
		if (!result.ok) {
			return fail(result.code === 'NOT_FOUND' ? 404 : 409, { error: result.error });
		}

		return { declineSuccess: true };
	}
};
