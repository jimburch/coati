import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/guards';
import { updateTeamSchema } from '$lib/types';
import {
	getTeamBySlugForAuth,
	getTeamMemberRole,
	updateTeam,
	deleteTeam
} from '$lib/server/queries/teams';
import { db } from '$lib/server/db';
import { teams } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);

	const authTeam = await getTeamBySlugForAuth(event.params.teamSlug);
	if (!authTeam) throw error(404, 'Team not found');

	const isOwner = authTeam.ownerId === user.id;
	const role = await getTeamMemberRole(authTeam.id, user.id);
	const isAdmin = isOwner || role === 'admin';

	if (!isAdmin) throw error(403, 'Only team owners and admins can manage team settings');

	const [team] = await db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			description: teams.description,
			avatarUrl: teams.avatarUrl,
			ownerId: teams.ownerId
		})
		.from(teams)
		.where(eq(teams.id, authTeam.id))
		.limit(1);

	return { team, isOwner };
};

export const actions: Actions = {
	updateTeam: async (event) => {
		const user = requireAuth(event);

		const team = await getTeamBySlugForAuth(event.params.teamSlug);
		if (!team) return fail(404, { updateError: 'Team not found' });

		const isOwner = team.ownerId === user.id;
		const role = await getTeamMemberRole(team.id, user.id);
		if (!isOwner && role !== 'admin') {
			return fail(403, { updateError: 'Only team owners and admins can update team settings' });
		}

		const formData = await event.request.formData();
		const name = (formData.get('name') as string | null)?.trim() ?? '';
		const descriptionRaw = (formData.get('description') as string | null)?.trim() ?? '';
		const avatarUrlRaw = (formData.get('avatarUrl') as string | null)?.trim() ?? '';

		const parsed = updateTeamSchema.safeParse({
			name: name || undefined,
			description: descriptionRaw ? descriptionRaw : null,
			avatarUrl: avatarUrlRaw ? avatarUrlRaw : null
		});
		if (!parsed.success) {
			return fail(400, { updateError: parsed.error.issues[0].message });
		}

		const updated = await updateTeam(team.id, parsed.data);
		if (!updated) return fail(404, { updateError: 'Team not found' });

		return { updateSuccess: true };
	},

	deleteTeam: async (event) => {
		const user = requireAuth(event);

		const team = await getTeamBySlugForAuth(event.params.teamSlug);
		if (!team) return fail(404, { deleteError: 'Team not found' });

		if (team.ownerId !== user.id) {
			return fail(403, { deleteError: 'Only the owner can delete a team' });
		}

		const formData = await event.request.formData();
		const confirmName = formData.get('confirmName') as string;
		if (confirmName !== team.name) {
			return fail(400, { deleteError: 'Team name does not match' });
		}

		await deleteTeam(team.id);
		throw redirect(303, '/teams');
	}
};
