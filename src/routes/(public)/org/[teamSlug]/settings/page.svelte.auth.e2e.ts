import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import 'dotenv/config';

// Deleting a Team deletes its Setups (spec #402, Decided while writing #2),
// so the delete dialog says how many go with it.

// One Team per project: desktop and mobile run in parallel.
const teamSlug = () => `e2e-delete-warning-${test.info().project.name}`;
/** The user tests/auth.setup.ts signs in as. */
const E2E_GITHUB_ID = -424242;

function connect() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');
	return postgres(url, { max: 1 });
}

test.beforeEach(async () => {
	const sql = connect();
	try {
		await sql`DELETE FROM teams WHERE slug = ${teamSlug()}`;
		const [user] = await sql`SELECT id FROM users WHERE github_id = ${E2E_GITHUB_ID}`;
		const [team] = await sql`
			INSERT INTO teams (name, slug, owner_id) VALUES ('E2E Delete Warning', ${teamSlug()}, ${user.id})
			RETURNING id`;
		await sql`INSERT INTO team_members (team_id, user_id, role) VALUES (${team.id}, ${user.id}, 'admin')`;
		for (const slug of ['e2e-team-setup-a', 'e2e-team-setup-b']) {
			await sql`
				INSERT INTO setups (user_id, team_id, slug, description, visibility)
				VALUES (${user.id}, ${team.id}, ${slug}, 'e2e', 'private')`;
		}
	} finally {
		await sql.end();
	}
});

test.afterEach(async () => {
	const sql = connect();
	try {
		await sql`DELETE FROM teams WHERE slug = ${teamSlug()}`;
	} finally {
		await sql.end();
	}
});

test("delete dialog warns that the team's setups are deleted too", async ({ page }) => {
	await page.goto(`/org/${teamSlug()}/settings`);
	await page.getByRole('button', { name: 'Delete team' }).click();

	const warning = page.getByTestId('delete-team-setups-warning');
	await expect(warning).toBeVisible();
	await expect(warning).toContainText('2 setups owned by this team are deleted too');
});
