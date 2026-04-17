import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireAuth } from '$lib/server/guards';
import { changeTeamMemberRoleSchema, createInviteSchema } from '$lib/types';
import {
	getTeamBySlugForAuth,
	getTeamMemberRole,
	getTeamMembers,
	removeTeamMember,
	changeTeamMemberRole,
	createInviteByUsername
} from '$lib/server/queries/teams';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);

	const team = await getTeamBySlugForAuth(event.params.teamSlug);
	if (!team) throw error(404, 'Team not found');

	const isOwner = team.ownerId === user.id;
	const role = await getTeamMemberRole(team.id, user.id);

	if (!isOwner && role !== 'admin') {
		throw error(403, 'Only team owners and admins can manage members');
	}

	const members = await getTeamMembers(team.id);
	return { team, members, currentUserId: user.id, isOwner };
};

export const actions: Actions = {
	removeMember: async (event) => {
		if (!event.locals.user) throw redirect(302, '/auth/login/github');
		const user = event.locals.user;

		const team = await getTeamBySlugForAuth(event.params.teamSlug);
		if (!team) return fail(404, { error: 'Team not found' });

		const formData = await event.request.formData();
		const targetUserId = formData.get('userId') as string;
		if (!targetUserId) return fail(400, { error: 'Missing userId' });

		const isSelf = targetUserId === user.id;

		if (isSelf) {
			if (team.ownerId === user.id) {
				return fail(400, { error: 'The owner cannot leave. Delete the team instead.' });
			}
			const callerRole = await getTeamMemberRole(team.id, user.id);
			if (!callerRole) return fail(403, { error: 'Not a team member' });
		} else {
			if (targetUserId === team.ownerId) {
				return fail(400, { error: 'Cannot remove the team owner' });
			}
			const callerIsOwner = team.ownerId === user.id;
			const callerRole = await getTeamMemberRole(team.id, user.id);
			if (!callerIsOwner && callerRole !== 'admin') {
				return fail(403, { error: 'Only owners and admins can remove members' });
			}
		}

		await removeTeamMember(team.id, targetUserId, team.ownerId);
		return { success: true };
	},

	inviteMember: async (event) => {
		if (!event.locals.user) throw redirect(302, '/auth/login/github');
		const user = event.locals.user;

		if (!user.hasBetaFeatures) return fail(403, { error: 'Beta features required' });

		const team = await getTeamBySlugForAuth(event.params.teamSlug);
		if (!team) return fail(404, { error: 'Team not found' });

		const isOwner = team.ownerId === user.id;
		const role = await getTeamMemberRole(team.id, user.id);
		if (!isOwner && role !== 'admin') {
			return fail(403, { error: 'Only team owners and admins can invite members' });
		}

		const formData = await event.request.formData();
		const username = formData.get('username') as string;

		const parsed = createInviteSchema.safeParse({ username });
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });

		const result = await createInviteByUsername(team.id, user.id, parsed.data.username);
		if (!result.ok) {
			return fail(result.code === 'NOT_FOUND' ? 404 : 409, { error: result.error });
		}

		return { inviteSuccess: true, invitedUsername: parsed.data.username };
	},

	changeRole: async (event) => {
		if (!event.locals.user) throw redirect(302, '/auth/login/github');
		const user = event.locals.user;

		const team = await getTeamBySlugForAuth(event.params.teamSlug);
		if (!team) return fail(404, { error: 'Team not found' });

		if (team.ownerId !== user.id) {
			return fail(403, { error: 'Only the owner can change member roles' });
		}

		const formData = await event.request.formData();
		const targetUserId = formData.get('userId') as string;
		const role = formData.get('role') as string;

		if (!targetUserId) return fail(400, { error: 'Missing userId' });
		if (targetUserId === user.id) return fail(400, { error: 'Cannot change your own role' });
		if (targetUserId === team.ownerId)
			return fail(400, { error: "Cannot change the owner's role" });

		const parsed = changeTeamMemberRoleSchema.safeParse({ role });
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0].message });

		const updated = await changeTeamMemberRole(team.id, targetUserId, parsed.data.role);
		if (!updated) return fail(404, { error: 'Member not found' });

		return { success: true };
	}
};
