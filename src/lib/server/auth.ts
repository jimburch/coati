import { GitHub } from 'arctic';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';

// ─── Arctic GitHub Provider ────────────────────────────────────────────────

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, null);

// ─── Token Helpers ─────────────────────────────────────────────────────────

export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Session Lifecycle ─────────────────────────────────────────────────────

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const COOKIE_NAME = 'magpie_session';

export async function createSession(token: string, userId: string) {
	const id = hashToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	const [session] = await db
		.insert(sessions)
		.values({ id, userId, expiresAt })
		.returning();
	return session;
}

export async function validateSessionToken(token: string) {
	const id = hashToken(token);
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

	// Sliding window: extend if less than 15 days remaining
	const timeRemaining = session.expiresAt.getTime() - Date.now();
	if (timeRemaining < SESSION_REFRESH_THRESHOLD_MS) {
		const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
		await db
			.update(sessions)
			.set({ expiresAt: newExpiresAt })
			.where(eq(sessions.id, id));
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

// ─── Cookie Helpers ────────────────────────────────────────────────────────

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_DURATION_MS / 1000
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.set(COOKIE_NAME, '', {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0
	});
}

export function getSessionToken(cookies: Cookies): string | undefined {
	return cookies.get(COOKIE_NAME);
}

// ─── GitHub User Upsert ────────────────────────────────────────────────────

interface GitHubUser {
	id: number;
	login: string;
	email: string | null;
	avatar_url: string;
	bio: string | null;
	blog: string | null;
}

interface GitHubEmail {
	email: string;
	primary: boolean;
	verified: boolean;
}

export async function upsertGithubUser(accessToken: string): Promise<string> {
	const [ghUser, ghEmails] = await Promise.all([
		fetchGitHubJson<GitHubUser>('https://api.github.com/user', accessToken),
		fetchGitHubJson<GitHubEmail[]>('https://api.github.com/user/emails', accessToken)
	]);

	const email =
		ghUser.email ?? ghEmails.find((e) => e.primary && e.verified)?.email ?? ghEmails[0]?.email;

	if (!email) {
		throw new Error('No email found on GitHub account');
	}

	const existing = await db.query.users.findFirst({
		where: eq(users.githubId, ghUser.id)
	});

	if (existing) {
		await db
			.update(users)
			.set({
				email,
				avatarUrl: ghUser.avatar_url,
				githubUsername: ghUser.login,
				bio: ghUser.bio ?? existing.bio,
				websiteUrl: ghUser.blog ?? existing.websiteUrl
			})
			.where(eq(users.id, existing.id));
		return existing.id;
	}

	const [newUser] = await db
		.insert(users)
		.values({
			githubId: ghUser.id,
			username: ghUser.login.toLowerCase(),
			email,
			avatarUrl: ghUser.avatar_url,
			githubUsername: ghUser.login,
			bio: ghUser.bio,
			websiteUrl: ghUser.blog
		})
		.returning();

	return newUser.id;
}

async function fetchGitHubJson<T>(url: string, accessToken: string): Promise<T> {
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: 'application/json',
			'User-Agent': 'Magpie'
		}
	});
	if (!res.ok) {
		throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}
