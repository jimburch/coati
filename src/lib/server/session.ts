/**
 * Vendored from Lucia's auth_session.ts (https://lucia-auth.com/), adapted to
 * Coati's `sessions` table (`id`, `user_id`, `expires_at`).
 *
 * Token format is unchanged so existing sessions stay valid:
 * a 64-char hex token (32 random bytes), stored as SHA-256 hex in `sessions.id`.
 */
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sessions } from '$lib/server/db/schema';
import { hashToken } from '$lib/server/crypto';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

export async function createSession(token: string, userId: string) {
	const id = await hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	const [session] = await db.insert(sessions).values({ id, userId, expiresAt }).returning();
	return session;
}

export async function validateSessionToken(token: string) {
	const id = await hashToken(token);
	const result = await db.query.sessions.findFirst({
		where: eq(sessions.id, id),
		with: { user: true }
	});

	if (!result) return null;
	if (result.expiresAt.getTime() < Date.now()) {
		await invalidateSession(id);
		return null;
	}

	const { user, ...session } = result;

	const timeRemaining = session.expiresAt.getTime() - Date.now();
	if (timeRemaining < SESSION_REFRESH_THRESHOLD_MS) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db.update(sessions).set({ expiresAt: newExpiresAt }).where(eq(sessions.id, id));
		session.expiresAt = newExpiresAt;
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}
