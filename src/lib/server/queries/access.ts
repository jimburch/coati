import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { teamMembers, setupShares } from '$lib/server/db/schema';

export type AccessSetup = {
	id: string;
	visibility: 'public' | 'private';
	userId: string;
	teamId: string | null;
};

export async function canViewSetup(
	setup: AccessSetup,
	viewerId: string | null | undefined
): Promise<boolean> {
	// 1. Public setup → allow
	if (setup.visibility === 'public') return true;

	// 2. Viewer is setup owner → allow
	if (viewerId && viewerId === setup.userId) return true;

	// Anonymous viewers cannot see private setups
	if (!viewerId) return false;

	// 3. Team setup + viewer is team member → allow
	if (setup.teamId) {
		const member = await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.teamId, setup.teamId), eq(teamMembers.userId, viewerId)))
			.limit(1);
		if (member.length > 0) return true;
	}

	// 4. setup_shares row exists for viewer → allow
	const share = await db
		.select({ id: setupShares.id })
		.from(setupShares)
		.where(and(eq(setupShares.setupId, setup.id), eq(setupShares.sharedWithUserId, viewerId)))
		.limit(1);
	if (share.length > 0) return true;

	return false;
}
