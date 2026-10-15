/**
 * Vendored from Lucia's auth_session.ts (https://lucia-auth.com/), adapted to
 * Coati's `sessions` table (`id`, `user_id`, `expires_at`).
 *
 * Token format is unchanged so existing sessions stay valid:
 * a 64-char hex token (32 random bytes), stored as SHA-256 hex in `sessions.id`.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { sessions } from '$lib/server/db/schema';
import { hashToken } from '$lib/server/crypto';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

export async function createSession(database: Database, token: string, userId: string) {
	const id = await hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	const [session] = await database.insert(sessions).values({ id, userId, expiresAt }).returning();
	return session;
}

export async function validateSessionToken(database: Database, token: string) {
	const id = await hashToken(token);
	const result = await database.query.sessions.findFirst({
		where: eq(sessions.id, id),
		with: { user: true }
	});

	if (!result) return null;
	if (result.expiresAt.getTime() < Date.now()) {
		await invalidateSession(database, id);
		return null;
	}

	const { user, ...session } = result;

	const timeRemaining = session.expiresAt.getTime() - Date.now();
	if (timeRemaining < SESSION_REFRESH_THRESHOLD_MS) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await database.update(sessions).set({ expiresAt: newExpiresAt }).where(eq(sessions.id, id));
		session.expiresAt = newExpiresAt;
	}

	return { session, user };
}

export async function invalidateSession(database: Database, sessionId: string): Promise<void> {
	await database.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllUserSessions(database: Database, userId: string): Promise<void> {
	await database.delete(sessions).where(eq(sessions.userId, userId));
}
