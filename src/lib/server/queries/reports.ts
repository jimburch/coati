import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { setupReports, setups, users } from '$lib/server/db/schema';

const reporters = alias(users, 'reporters');

export async function createReport(
	setupId: string,
	reporterId: string,
	reason: 'malicious' | 'spam' | 'inappropriate' | 'other',
	description?: string
) {
	const [report] = await db
		.insert(setupReports)
		.values({ setupId, reporterId, reason, description })
		.returning();
	return report;
}

export async function getPendingReportsWithDetails() {
	return db
		.select({
			id: setupReports.id,
			reason: setupReports.reason,
			description: setupReports.description,
			status: setupReports.status,
			createdAt: setupReports.createdAt,
			setupId: setupReports.setupId,
			setupName: setups.name,
			setupSlug: setups.slug,
			ownerUsername: users.username,
			reporterId: setupReports.reporterId,
			reporterUsername: reporters.username,
			reporterAvatarUrl: reporters.avatarUrl
		})
		.from(setupReports)
		.innerJoin(setups, eq(setupReports.setupId, setups.id))
		.innerJoin(users, eq(setups.userId, users.id))
		.innerJoin(reporters, eq(setupReports.reporterId, reporters.id))
		.where(eq(setupReports.status, 'pending'))
		.orderBy(desc(setupReports.createdAt));
}

export async function updateReportStatus(
	reportId: string,
	status: 'dismissed' | 'actioned',
	reviewedBy: string
) {
	const [updated] = await db
		.update(setupReports)
		.set({ status, reviewedAt: new Date(), reviewedBy })
		.where(eq(setupReports.id, reportId))
		.returning();
	return updated;
}
