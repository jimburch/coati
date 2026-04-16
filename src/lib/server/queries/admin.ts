import { eq, ilike, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, feedbackSubmissions } from '$lib/server/db/schema';

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
