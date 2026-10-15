import { GitHub } from 'arctic';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { sanitizeUsername } from '$lib/utils/username';
import { hashToken, randomHex } from '$lib/server/crypto';

export {
	createSession,
	validateSessionToken,
	invalidateSession,
	invalidateAllUserSessions
} from '$lib/server/session';

// ─── Arctic GitHub Provider ────────────────────────────────────────────────

/** Built per call so Worker secrets are read in the request, not at module load. */
export function createGitHubClient(): GitHub {
	return new GitHub(env.GITHUB_CLIENT_ID!, env.GITHUB_CLIENT_SECRET!, null);
}

// ─── Token Helpers ─────────────────────────────────────────────────────────

export { hashToken };

export function generateSessionToken(): string {
	return randomHex(32);
}

// ─── Session Lifecycle ─────────────────────────────────────────────────────

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'coati_session';

// ─── Cookie Helpers ────────────────────────────────────────────────────────

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_DURATION_MS / 1000
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.set(COOKIE_NAME, '', {
		httpOnly: true,
		secure: !dev,
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
			username: sanitizeUsername(ghUser.login, ghUser.id),
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
			'User-Agent': 'Coati'
		}
	});
	if (!res.ok) {
		throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}
