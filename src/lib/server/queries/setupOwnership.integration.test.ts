/**
 * Setup path ownership after the cutover (#405): slugs are unique per owner
 * (the user for personal Setups, the Team for Team Setups), and a Team owns
 * its Setups outright, so deleting the Team deletes them.
 *
 * Hits the real test database through the query functions.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
		GITHUB_CLIENT_ID: 'test',
		GITHUB_CLIENT_SECRET: 'test'
	}
}));

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups, setupSlugRedirects, users } from '$lib/server/db/schema';
import { isUniqueViolation } from '$lib/server/responses';
import { createSetup, updateSetupByIdWithSlugRedirects } from './setups';
import { createTeam, deleteTeam, getTeamSetupsCount, getUserTeams } from './teams';
import { createTestUser, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

function uniqueSlug(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

describe.skipIf(!hasDatabase)('Setup path ownership — integration', () => {
	const createdUserIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
	});

	async function teamWithTwoMembers() {
		const alice = await createTestUser();
		const bob = await createTestUser();
		createdUserIds.push(alice.id, bob.id);
		const team = await createTeam(alice.id, { name: 'Acme', slug: uniqueSlug('acme') });
		return { alice, bob, team };
	}

	it('two Team Members cannot both create the same slug in their Team', async () => {
		const { alice, bob, team } = await teamWithTwoMembers();
		const slug = uniqueSlug('x');

		await createSetup(alice.id, { slug, description: 'first', teamId: team.id });

		const second = createSetup(bob.id, { slug, description: 'second', teamId: team.id });
		await expect(second).rejects.toSatisfy(isUniqueViolation);
	});

	it("one user can own both the personal `x` and their Team's `x`", async () => {
		const { alice, team } = await teamWithTwoMembers();
		const slug = uniqueSlug('x');

		const personal = await createSetup(alice.id, { slug, description: 'mine' });
		const teamOwned = await createSetup(alice.id, { slug, description: 'ours', teamId: team.id });

		expect(personal.id).not.toBe(teamOwned.id);
		expect(personal.teamId).toBeNull();
		expect(teamOwned.teamId).toBe(team.id);
	});

	it('a user still cannot create two personal Setups with the same slug', async () => {
		const alice = await createTestUser();
		createdUserIds.push(alice.id);
		const slug = uniqueSlug('x');

		await createSetup(alice.id, { slug, description: 'one' });
		await expect(createSetup(alice.id, { slug, description: 'two' })).rejects.toSatisfy(
			isUniqueViolation
		);
	});

	it('renaming a Team Setup keys its redirect by the Team', async () => {
		const { alice, team } = await teamWithTwoMembers();
		const oldSlug = uniqueSlug('old');
		const newSlug = uniqueSlug('new');
		const created = await createSetup(alice.id, {
			slug: oldSlug,
			description: 'd',
			teamId: team.id
		});

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ slug: newSlug },
			{ userId: alice.id, teamId: team.id, currentSlug: oldSlug }
		);

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toEqual([
			expect.objectContaining({ oldSlug, teamId: team.id, userId: null })
		]);
	});

	it("deleting a Team deletes its Setups and their redirects, and fixes creators' Setup counts", async () => {
		const { bob, team } = await teamWithTwoMembers();
		const personal = await createSetup(bob.id, { slug: uniqueSlug('keep'), description: 'd' });
		const teamSetup = await createSetup(bob.id, {
			slug: uniqueSlug('team'),
			description: 'd',
			teamId: team.id
		});
		await updateSetupByIdWithSlugRedirects(
			teamSetup.id,
			{ slug: uniqueSlug('renamed') },
			{ userId: bob.id, teamId: team.id, currentSlug: teamSetup.slug }
		);

		await deleteTeam(team.id);

		expect(await db.select().from(setups).where(eq(setups.id, teamSetup.id))).toHaveLength(0);
		expect(
			await db.select().from(setupSlugRedirects).where(eq(setupSlugRedirects.setupId, teamSetup.id))
		).toHaveLength(0);
		expect(await db.select().from(setups).where(eq(setups.id, personal.id))).toHaveLength(1);

		const [bobRow] = await db
			.select({ setupsCount: users.setupsCount })
			.from(users)
			.where(eq(users.id, bob.id));
		expect(bobRow.setupsCount).toBe(1);
	});

	it('counts the Setups a Team owns, for the delete warning', async () => {
		const { alice, bob, team } = await teamWithTwoMembers();
		await createSetup(alice.id, { slug: uniqueSlug('a'), description: 'd', teamId: team.id });
		await createSetup(bob.id, { slug: uniqueSlug('b'), description: 'd', teamId: team.id });
		await createSetup(bob.id, { slug: uniqueSlug('personal'), description: 'd' });

		expect(await getTeamSetupsCount(team.id)).toBe(2);
		const [listed] = (await getUserTeams(alice.id)).filter((t) => t.id === team.id);
		expect(listed.setupsCount).toBe(2);
	});
});
