import { eq, and, desc, sql, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { teams, teamMembers, teamInvites, setups, users, activities } from '$lib/server/db/schema';
import { randomBytes } from 'crypto';
import type { z } from 'zod';
import type { createTeamSchema, updateTeamSchema } from '$lib/types';

type CreateTeamInput = z.infer<typeof createTeamSchema>;
type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export async function createTeam(userId: string, data: CreateTeamInput) {
	return db.transaction(async (tx) => {
		const [team] = await tx
			.insert(teams)
			.values({
				name: data.name,
				slug: data.slug,
				description: data.description,
				ownerId: userId
			})
			.returning();

		await tx.insert(teamMembers).values({
			teamId: team.id,
			userId,
			role: 'admin'
		});

		await tx.insert(activities).values({
			userId,
			teamId: team.id,
			actionType: 'created_team'
		});

		return team;
	});
}

export async function getTeamBySlug(slug: string, viewerId?: string | null) {
	const result = await db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			description: teams.description,
			avatarUrl: teams.avatarUrl,
			ownerId: teams.ownerId,
			membersCount: teams.membersCount,
			createdAt: teams.createdAt,
			updatedAt: teams.updatedAt
		})
		.from(teams)
		.where(eq(teams.slug, slug))
		.limit(1);

	if (!result[0]) return null;

	const team = result[0];

	let viewerIsMember = false;
	if (viewerId) {
		const role = await getTeamMemberRole(team.id, viewerId);
		viewerIsMember = role !== null;
	}

	const teamSetups = await db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			display: setups.display,
			visibility: setups.visibility,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt,
			teamSlug: teams.slug,
			teamName: teams.name,
			teamAvatarUrl: teams.avatarUrl,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setups)
		.innerJoin(teams, eq(setups.teamId, teams.id))
		.innerJoin(users, eq(setups.userId, users.id))
		.where(
			viewerIsMember
				? eq(setups.teamId, team.id)
				: and(eq(setups.teamId, team.id), eq(setups.visibility, 'public'))
		)
		.orderBy(desc(setups.createdAt));

	return { ...team, setups: teamSetups };
}

export async function getTeamBySlugForAuth(slug: string) {
	const result = await db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			ownerId: teams.ownerId
		})
		.from(teams)
		.where(eq(teams.slug, slug))
		.limit(1);

	return result[0] ?? null;
}

export async function getTeamByIdForAuth(id: string) {
	const result = await db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			ownerId: teams.ownerId
		})
		.from(teams)
		.where(eq(teams.id, id))
		.limit(1);

	return result[0] ?? null;
}

export async function getTeamMemberRole(
	teamId: string,
	userId: string
): Promise<'admin' | 'member' | null> {
	const result = await db
		.select({ role: teamMembers.role })
		.from(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
		.limit(1);

	return result[0]?.role ?? null;
}

export async function updateTeam(teamId: string, data: UpdateTeamInput) {
	const updateFields: Partial<typeof teams.$inferInsert> = {};
	if (data.name !== undefined) updateFields.name = data.name;
	if (data.description !== undefined) updateFields.description = data.description ?? undefined;
	if (data.avatarUrl !== undefined) updateFields.avatarUrl = data.avatarUrl ?? undefined;

	const [updated] = await db
		.update(teams)
		.set(updateFields)
		.where(eq(teams.id, teamId))
		.returning();

	return updated ?? null;
}

export async function deleteTeam(teamId: string) {
	const deleted = await db.delete(teams).where(eq(teams.id, teamId)).returning();
	return deleted.length;
}

export async function getUserTeams(userId: string) {
	return db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			description: teams.description,
			avatarUrl: teams.avatarUrl,
			ownerId: teams.ownerId,
			membersCount: teams.membersCount,
			role: teamMembers.role,
			joinedAt: teamMembers.joinedAt
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teamMembers.teamId, teams.id))
		.where(eq(teamMembers.userId, userId))
		.orderBy(desc(teamMembers.joinedAt));
}

export async function getTeamMembers(teamId: string) {
	return db
		.select({
			userId: teamMembers.userId,
			role: teamMembers.role,
			joinedAt: teamMembers.joinedAt,
			username: users.username,
			avatarUrl: users.avatarUrl,
			name: users.name
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.userId, users.id))
		.where(eq(teamMembers.teamId, teamId))
		.orderBy(teamMembers.joinedAt);
}

export async function removeTeamMember(teamId: string, userId: string, ownerId: string) {
	await db.transaction(async (tx) => {
		await tx
			.update(setups)
			.set({ userId: ownerId })
			.where(and(eq(setups.teamId, teamId), eq(setups.userId, userId)));

		await tx
			.delete(teamMembers)
			.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

		await tx
			.update(teams)
			.set({ membersCount: sql`${teams.membersCount} - 1` })
			.where(eq(teams.id, teamId));

		await tx.insert(activities).values({
			userId,
			teamId,
			actionType: 'left_team'
		});
	});
}

export async function changeTeamMemberRole(
	teamId: string,
	userId: string,
	role: 'admin' | 'member'
) {
	const [updated] = await db
		.update(teamMembers)
		.set({ role })
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
		.returning();
	return updated ?? null;
}

export async function leaveTeam(teamId: string, userId: string, ownerId: string) {
	return removeTeamMember(teamId, userId, ownerId);
}

export async function getTeamSetupBySlug(teamSlug: string, setupSlug: string) {
	const result = await db
		.select({
			id: setups.id,
			userId: setups.userId,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			display: setups.display,
			readme: setups.readme,
			category: setups.category,
			license: setups.license,
			minToolVersion: setups.minToolVersion,
			postInstall: setups.postInstall,
			prerequisites: setups.prerequisites,
			visibility: setups.visibility,
			teamId: setups.teamId,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			commentsCount: setups.commentsCount,
			createdAt: setups.createdAt,
			updatedAt: setups.updatedAt,
			featuredAt: setups.featuredAt,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl,
			teamName: teams.name,
			teamSlug: teams.slug,
			teamAvatarUrl: teams.avatarUrl
		})
		.from(setups)
		.innerJoin(teams, eq(setups.teamId, teams.id))
		.innerJoin(users, eq(setups.userId, users.id))
		.where(and(eq(teams.slug, teamSlug), eq(setups.slug, setupSlug)))
		.limit(1);

	return result[0] ?? null;
}

export async function getTeamPendingInviteCount(teamId: string): Promise<number> {
	const result = await db
		.select({ count: count() })
		.from(teamInvites)
		.where(and(eq(teamInvites.teamId, teamId), eq(teamInvites.status, 'pending')))
		.limit(1);
	return result[0]?.count ?? 0;
}

export async function createInviteByUsername(
	teamId: string,
	invitedByUserId: string,
	username: string
): Promise<
	{ ok: true; invite: typeof teamInvites.$inferSelect } | { ok: false; error: string; code: string }
> {
	const invitedUser = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username))
		.limit(1);

	if (!invitedUser[0]) {
		return { ok: false, error: 'User not found', code: 'NOT_FOUND' };
	}

	const targetUser = invitedUser[0];

	const existingMember = await db
		.select({ userId: teamMembers.userId })
		.from(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUser.id)))
		.limit(1);

	if (existingMember[0]) {
		return { ok: false, error: 'User is already a team member', code: 'ALREADY_MEMBER' };
	}

	const existingInvite = await db
		.select({ id: teamInvites.id })
		.from(teamInvites)
		.where(
			and(
				eq(teamInvites.teamId, teamId),
				eq(teamInvites.invitedUserId, targetUser.id),
				eq(teamInvites.status, 'pending')
			)
		)
		.limit(1);

	if (existingInvite[0]) {
		return { ok: false, error: 'User already has a pending invite', code: 'ALREADY_INVITED' };
	}

	const pendingCount = await getTeamPendingInviteCount(teamId);
	if (pendingCount >= 50) {
		return {
			ok: false,
			error: 'Team has reached the maximum number of pending invites',
			code: 'RATE_LIMIT'
		};
	}

	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	const [invite] = await db
		.insert(teamInvites)
		.values({
			teamId,
			invitedByUserId,
			invitedUserId: targetUser.id,
			token,
			status: 'pending',
			expiresAt
		})
		.returning();

	return { ok: true, invite };
}

export async function acceptInvite(
	token: string,
	userId: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
	const inviteResult = await db
		.select()
		.from(teamInvites)
		.where(eq(teamInvites.token, token))
		.limit(1);

	const invite = inviteResult[0];
	if (!invite) return { ok: false, error: 'Invite not found', code: 'NOT_FOUND' };
	if (invite.invitedUserId !== userId)
		return { ok: false, error: 'This invite is not for you', code: 'FORBIDDEN' };
	if (invite.status !== 'pending')
		return { ok: false, error: 'Invite is no longer pending', code: 'INVALID_STATUS' };
	if (invite.expiresAt < new Date())
		return { ok: false, error: 'Invite has expired', code: 'EXPIRED' };

	await db.transaction(async (tx) => {
		await tx.insert(teamMembers).values({
			teamId: invite.teamId,
			userId,
			role: 'member'
		});

		await tx.update(teamInvites).set({ status: 'accepted' }).where(eq(teamInvites.id, invite.id));

		await tx
			.update(teams)
			.set({ membersCount: sql`${teams.membersCount} + 1` })
			.where(eq(teams.id, invite.teamId));

		await tx.insert(activities).values({
			userId,
			teamId: invite.teamId,
			actionType: 'joined_team'
		});
	});

	return { ok: true };
}

export async function declineInvite(
	token: string,
	userId: string
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
	const inviteResult = await db
		.select()
		.from(teamInvites)
		.where(eq(teamInvites.token, token))
		.limit(1);

	const invite = inviteResult[0];
	if (!invite) return { ok: false, error: 'Invite not found', code: 'NOT_FOUND' };
	if (invite.invitedUserId !== userId)
		return { ok: false, error: 'This invite is not for you', code: 'FORBIDDEN' };
	if (invite.status !== 'pending')
		return { ok: false, error: 'Invite is no longer pending', code: 'INVALID_STATUS' };

	await db.update(teamInvites).set({ status: 'declined' }).where(eq(teamInvites.id, invite.id));

	return { ok: true };
}

export async function getPendingInvites(userId: string) {
	return db
		.select({
			id: teamInvites.id,
			token: teamInvites.token,
			status: teamInvites.status,
			expiresAt: teamInvites.expiresAt,
			createdAt: teamInvites.createdAt,
			teamId: teams.id,
			teamName: teams.name,
			teamSlug: teams.slug,
			teamAvatarUrl: teams.avatarUrl,
			invitedByUsername: users.username,
			invitedByAvatarUrl: users.avatarUrl
		})
		.from(teamInvites)
		.innerJoin(teams, eq(teamInvites.teamId, teams.id))
		.leftJoin(users, eq(teamInvites.invitedByUserId, users.id))
		.where(and(eq(teamInvites.invitedUserId, userId), eq(teamInvites.status, 'pending')))
		.orderBy(desc(teamInvites.createdAt));
}

export async function getTeamSetups(teamId: string, viewerIsMember: boolean) {
	return db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			display: setups.display,
			visibility: setups.visibility,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt,
			teamSlug: teams.slug,
			teamName: teams.name,
			teamAvatarUrl: teams.avatarUrl,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setups)
		.innerJoin(teams, eq(setups.teamId, teams.id))
		.innerJoin(users, eq(setups.userId, users.id))
		.where(
			viewerIsMember
				? eq(setups.teamId, teamId)
				: and(eq(setups.teamId, teamId), eq(setups.visibility, 'public'))
		)
		.orderBy(desc(setups.createdAt));
}
