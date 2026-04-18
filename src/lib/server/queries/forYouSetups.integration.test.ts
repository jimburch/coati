/**
 * Integration tests for getForYouSetups.
 *
 * Hits a real Postgres — no mocks — so SQL syntax errors and parameter-binding
 * bugs are caught (which the mocked forYouSetups.test.ts cannot detect because
 * it stubs the `sql` template itself).
 *
 * Skips automatically if no DATABASE_URL_TEST / DATABASE_URL is set.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL:
			process.env.DATABASE_URL_TEST ??
			process.env.DATABASE_URL ??
			'postgresql://coati:coati@localhost:5432/coati_dev',
		GITHUB_CLIENT_ID: 'test',
		GITHUB_CLIENT_SECRET: 'test'
	}
}));

import { getForYouSetups } from './setups';
import {
	createTestUser,
	createTestSetup,
	createTestAgent,
	linkAgentToSetup,
	deleteTestUsers,
	deleteTestAgents
} from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('getForYouSetups — integration', () => {
	const createdUserIds: string[] = [];
	const createdAgentIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
		await deleteTestAgents(createdAgentIds.splice(0));
	});

	it('returns setups whose agents overlap with the viewer (hasAgents path)', async () => {
		const viewer = await createTestUser();
		const other = await createTestUser();
		createdUserIds.push(viewer.id, other.id);

		const agent = await createTestAgent();
		createdAgentIds.push(agent.id);

		// Viewer owns a setup tagged with the agent — establishes hasAgents=true.
		const viewerSetup = await createTestSetup(viewer.id);
		await linkAgentToSetup(viewerSetup.id, agent.id);

		// Other user publishes a setup with the same agent — this is a candidate result.
		const candidate = await createTestSetup(other.id);
		await linkAgentToSetup(candidate.id, agent.id);

		const results = await getForYouSetups(viewer.id, 6);

		// Candidate setup should appear; viewer's own setup must not.
		const ids = results.map((r) => r.id);
		expect(ids).toContain(candidate.id);
		expect(ids).not.toContain(viewerSetup.id);
	});

	it('does not duplicate setups when viewer and candidate share multiple agents', async () => {
		// Would fail against the old `SELECT DISTINCT + INNER JOIN setup_agents` pattern
		// (row multiplied per matching agent); also exercises the array-parameter binding
		// that broke when agentIds was sent as a single text param.
		const viewer = await createTestUser();
		const other = await createTestUser();
		createdUserIds.push(viewer.id, other.id);

		const agentA = await createTestAgent();
		const agentB = await createTestAgent();
		createdAgentIds.push(agentA.id, agentB.id);

		const viewerSetup = await createTestSetup(viewer.id);
		await linkAgentToSetup(viewerSetup.id, agentA.id);
		await linkAgentToSetup(viewerSetup.id, agentB.id);

		const candidate = await createTestSetup(other.id);
		await linkAgentToSetup(candidate.id, agentA.id);
		await linkAgentToSetup(candidate.id, agentB.id);

		const results = await getForYouSetups(viewer.id, 6);

		const candidateCount = results.filter((r) => r.id === candidate.id).length;
		expect(candidateCount).toBe(1);
	});
});
