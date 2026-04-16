import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { teams, teamMembers, setups, users, activities } from '$lib/server/db/schema';
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

export async function getTeamBySlug(slug: string) {
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

	const teamSetups = await db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			display: setups.display,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.where(and(eq(setups.teamId, team.id), eq(setups.visibility, 'public')))
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
