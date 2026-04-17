import { eq, ilike, count, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, feedbackSubmissions, teams, setups } from '$lib/server/db/schema';

export async function getAllUsersWithFeedbackCount(search?: string) {
	const baseQuery = db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			avatarUrl: users.avatarUrl,
			githubUsername: users.githubUsername,
			isAdmin: users.isAdmin,
			isBetaApproved: users.isBetaApproved,
			hasBetaFeatures: users.hasBetaFeatures,
			lastLoginAt: users.lastLoginAt,
			createdAt: users.createdAt,
			feedbackCount: count(feedbackSubmissions.id)
		})
		.from(users)
		.leftJoin(feedbackSubmissions, eq(feedbackSubmissions.userId, users.id))
		.groupBy(users.id)
		.orderBy(users.createdAt);

	if (search) {
		return baseQuery.where(ilike(users.username, `%${search}%`));
	}

	return baseQuery;
}

export async function setUserBetaApproval(userId: string, approved: boolean) {
	await db.update(users).set({ isBetaApproved: approved }).where(eq(users.id, userId));
}

export async function setUserBetaFeaturesEnabled(userId: string, enabled: boolean) {
	await db.update(users).set({ hasBetaFeatures: enabled }).where(eq(users.id, userId));
}

export async function getAllTeamsWithAdminDetails(search?: string) {
	const baseQuery = db
		.select({
			id: teams.id,
			name: teams.name,
			slug: teams.slug,
			avatarUrl: teams.avatarUrl,
			ownerId: teams.ownerId,
			ownerUsername: users.username,
			membersCount: teams.membersCount,
			setupsCount: count(setups.id),
			createdAt: teams.createdAt
		})
		.from(teams)
		.innerJoin(users, eq(teams.ownerId, users.id))
		.leftJoin(setups, eq(setups.teamId, teams.id))
		.groupBy(teams.id, users.username)
		.orderBy(teams.createdAt);

	if (search) {
		return baseQuery.where(or(ilike(teams.name, `%${search}%`), ilike(teams.slug, `%${search}%`)));
	}

	return baseQuery;
}

export async function adminDeleteTeam(teamId: string) {
	const deleted = await db.delete(teams).where(eq(teams.id, teamId)).returning();
	return deleted.length;
}
