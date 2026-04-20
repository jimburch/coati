import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';
import 'dotenv/config';

// Seeds a stable test user + Lucia session into the dev database the
// preview server is pointing at, then writes a Playwright storageState JSON
// that carries the session cookie. The `desktop-auth` / `mobile-auth`
// projects load this state so auth-gated e2e tests run as a real user.

const STORAGE_STATE = path.resolve('playwright/.auth/user.json');

// Stable identifiers so repeated runs upsert the same row instead of piling
// up orphans. GitHub ids are positive; using a negative number guarantees no
// collision with a real upsert.
export const TEST_USER = {
	githubId: -424242,
	username: 'e2e-test-user',
	email: 'e2e@coati.test',
	avatarUrl: 'https://avatars.githubusercontent.com/u/0?v=4',
	githubUsername: 'e2e-test-user',
	name: 'E2E Test User'
};

const COOKIE_NAME = 'coati_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

setup('authenticate', async () => {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		throw new Error('DATABASE_URL is not set; cannot seed authenticated test user.');
	}

	const sql = postgres(dbUrl, { max: 1 });
	try {
		const [user] = await sql<{ id: string }[]>`
			insert into users (
				github_id, username, email, avatar_url, github_username, name
			) values (
				${TEST_USER.githubId}, ${TEST_USER.username}, ${TEST_USER.email},
				${TEST_USER.avatarUrl}, ${TEST_USER.githubUsername}, ${TEST_USER.name}
			)
			on conflict (github_id) do update set
				username = excluded.username,
				email = excluded.email,
				avatar_url = excluded.avatar_url,
				github_username = excluded.github_username,
				name = excluded.name
			returning id
		`;

		// Clear prior sessions for this user so storageState doesn't grow stale
		// across repeated runs.
		await sql`delete from sessions where user_id = ${user.id}`;

		const token = crypto.randomBytes(32).toString('hex');
		const sessionId = hashToken(token);
		const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

		await sql`
			insert into sessions (id, user_id, expires_at)
			values (${sessionId}, ${user.id}, ${expiresAt})
		`;

		const storage = {
			cookies: [
				{
					name: COOKIE_NAME,
					value: token,
					domain: 'localhost',
					path: '/',
					expires: Math.floor(expiresAt.getTime() / 1000),
					httpOnly: true,
					secure: false,
					sameSite: 'Lax' as const
				}
			],
			origins: []
		};

		fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
		fs.writeFileSync(STORAGE_STATE, JSON.stringify(storage, null, 2));
	} finally {
		await sql.end();
	}
});
