import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/guards';
import { createTeamSchema } from '$lib/types';
import {
	createTeam,
	getUserTeams,
	getTeamBySlugForAuth,
	deleteTeam
} from '$lib/server/queries/teams';
import { isUniqueViolation } from '$lib/server/responses';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);
	const myTeams = await getUserTeams(user.id);
	return { myTeams, hasBetaFeatures: user.hasBetaFeatures };
};

export const actions: Actions = {
	createTeam: async (event) => {
		const { locals, request } = event;
		if (!locals.user) throw redirect(302, '/auth/login/github');
		if (!locals.user.hasBetaFeatures) throw error(403, 'Beta features required');

		const formData = await request.formData();
		const raw = {
			name: formData.get('name') as string,
			slug: formData.get('slug') as string,
			description: (formData.get('description') as string) || undefined
		};

		const parsed = createTeamSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { createError: parsed.error.issues[0].message, fields: raw });
		}

		try {
			const team = await createTeam(locals.user.id, parsed.data);
			throw redirect(302, `/org/${team.slug}`);
		} catch (err: unknown) {
			if (err instanceof Response || (err as { status?: number })?.status === 302) throw err;
			if (isUniqueViolation(err)) {
				return fail(409, {
					createError: 'A team with this slug already exists',
					fields: raw
				});
			}
			throw err;
		}
	},

	deleteTeam: async (event) => {
		const { locals, request } = event;
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const formData = await request.formData();
		const slug = formData.get('slug') as string;
		const confirmName = formData.get('confirmName') as string;

		const team = await getTeamBySlugForAuth(slug);
		if (!team) return fail(404, { deleteError: 'Team not found' });
		if (team.ownerId !== locals.user.id)
			return fail(403, { deleteError: 'Only the owner can delete a team' });
		if (confirmName !== team.name) return fail(400, { deleteError: 'Team name does not match' });

		await deleteTeam(team.id);
		return { deleted: true };
	}
};
