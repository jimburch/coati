import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { updateSetup } from '$lib/server/queries/setups';
import { shareSetup, unshareSetup, getSetupShares } from '$lib/server/queries/setupShares';
import { getUserByUsername } from '$lib/server/queries/users';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login/github');

	const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
	if (!setup) throw error(404, 'Setup not found');
	if (setup.userId !== locals.user.id) throw error(403, 'Forbidden');

	const shares = setup.visibility === 'private' ? await getSetupShares(setup.id) : [];

	return {
		setup,
		user: locals.user,
		shares
	};
};

export const actions: Actions = {
	setVisibility: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!setup) throw error(404, 'Setup not found');
		if (setup.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const visibility = formData.get('visibility');

		if (visibility !== 'public' && visibility !== 'private') {
			return fail(400, { error: 'Invalid visibility value', code: 'INVALID_VISIBILITY' });
		}

		await updateSetup(setup.id, { visibility });

		return { visibility };
	},

	shareUser: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!setup) throw error(404, 'Setup not found');
		if (setup.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}
		if (setup.visibility !== 'private') {
			return fail(400, { error: 'Can only share private setups', code: 'INVALID_VISIBILITY' });
		}

		const formData = await request.formData();
		const username = formData.get('username');
		if (typeof username !== 'string' || !username.trim()) {
			return fail(400, { error: 'Username is required', code: 'VALIDATION_ERROR' });
		}

		const target = await getUserByUsername(username.trim());
		if (!target) return fail(404, { error: 'User not found', code: 'NOT_FOUND' });
		if (target.id === locals.user.id) {
			return fail(400, { error: 'Cannot share with yourself', code: 'INVALID_TARGET' });
		}

		try {
			await shareSetup(setup.id, locals.user.id, target.id);
		} catch (err: unknown) {
			const isUnique =
				typeof err === 'object' &&
				err !== null &&
				'code' in err &&
				(err as { code: string }).code === '23505';
			if (isUnique) {
				return fail(409, {
					error: 'Setup already shared with this user',
					code: 'ALREADY_SHARED'
				});
			}
			throw err;
		}

		return { shared: true };
	},

	unshareUser: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!setup) throw error(404, 'Setup not found');
		if (setup.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		if (typeof userId !== 'string' || !userId) {
			return fail(400, { error: 'userId is required', code: 'VALIDATION_ERROR' });
		}

		await unshareSetup(setup.id, userId);
		return { unshared: true };
	}
};
