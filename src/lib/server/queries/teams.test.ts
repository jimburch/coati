import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTeamSchema, updateTeamSchema } from '$lib/types';

// ── Schema tests (no DB needed) ───────────────────────────────────────────────

describe('createTeamSchema', () => {
	it('accepts valid input', () => {
		const result = createTeamSchema.safeParse({
			name: 'My Team',
			slug: 'my-team',
			description: 'A great team'
		});
		expect(result.success).toBe(true);
	});

	it('accepts input without description', () => {
		const result = createTeamSchema.safeParse({ name: 'My Team', slug: 'my-team' });
		expect(result.success).toBe(true);
	});

	it('rejects empty name', () => {
		const result = createTeamSchema.safeParse({ name: '', slug: 'my-team' });
		expect(result.success).toBe(false);
	});

	it('rejects slug with invalid characters', () => {
		const result = createTeamSchema.safeParse({ name: 'My Team', slug: 'My Team!' });
		expect(result.success).toBe(false);
	});

	it('rejects slug with uppercase', () => {
		const result = createTeamSchema.safeParse({ name: 'My Team', slug: 'MyTeam' });
		expect(result.success).toBe(false);
	});

	it('rejects description over 300 chars', () => {
		const result = createTeamSchema.safeParse({
			name: 'My Team',
			slug: 'my-team',
			description: 'a'.repeat(301)
		});
		expect(result.success).toBe(false);
	});

	it('rejects name over 100 chars', () => {
		const result = createTeamSchema.safeParse({
			name: 'a'.repeat(101),
			slug: 'my-team'
		});
		expect(result.success).toBe(false);
	});
});

describe('updateTeamSchema', () => {
	it('accepts partial updates', () => {
		const result = updateTeamSchema.safeParse({ name: 'New Name' });
		expect(result.success).toBe(true);
	});

	it('accepts null description to clear it', () => {
		const result = updateTeamSchema.safeParse({ description: null });
		expect(result.success).toBe(true);
	});

	it('accepts null avatarUrl to clear it', () => {
		const result = updateTeamSchema.safeParse({ avatarUrl: null });
		expect(result.success).toBe(true);
	});

	it('rejects invalid avatarUrl', () => {
		const result = updateTeamSchema.safeParse({ avatarUrl: 'not-a-url' });
		expect(result.success).toBe(false);
	});

	it('accepts empty object (no-op update)', () => {
		const result = updateTeamSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

// ── Query function tests (mocked DB) ─────────────────────────────────────────

const state = vi.hoisted(() => ({
	rows: [] as Record<string, unknown>[],
	txInsertCalls: [] as string[],
	txDeleteRows: 0
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
	and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
	desc: vi.fn((col: unknown) => ({ _type: 'desc', col }))
}));

vi.mock('$lib/server/db/schema', () => ({
	teams: {
		id: 'teams.id',
		name: 'teams.name',
		slug: 'teams.slug',
		description: 'teams.description',
		avatarUrl: 'teams.avatarUrl',
		ownerId: 'teams.ownerId',
		membersCount: 'teams.membersCount',
		createdAt: 'teams.createdAt',
		updatedAt: 'teams.updatedAt',
		$inferInsert: {}
	},
	teamMembers: {
		id: 'teamMembers.id',
		teamId: 'teamMembers.teamId',
		userId: 'teamMembers.userId',
		role: 'teamMembers.role',
		joinedAt: 'teamMembers.joinedAt'
	},
	setups: {
		id: 'setups.id',
		name: 'setups.name',
		slug: 'setups.slug',
		description: 'setups.description',
		display: 'setups.display',
		starsCount: 'setups.starsCount',
		clonesCount: 'setups.clonesCount',
		updatedAt: 'setups.updatedAt',
		teamId: 'setups.teamId',
		userId: 'setups.userId',
		visibility: 'setups.visibility'
	},
	users: {
		id: 'users.id',
		username: 'users.username',
		avatarUrl: 'users.avatarUrl'
	},
	activities: {
		userId: 'activities.userId',
		teamId: 'activities.teamId',
		actionType: 'activities.actionType'
	}
}));

const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};

	const txChain: Record<string, unknown> = {};
	txChain['insert'] = vi.fn(() => ({
		values: vi.fn((...args: unknown[]) => {
			mockInsertValues(...args);
			state.txInsertCalls.push(JSON.stringify(args));
			return {
				returning: vi.fn(() =>
					Promise.resolve([
						{
							id: 'team-1',
							name: 'My Team',
							slug: 'my-team',
							ownerId: 'user-1',
							membersCount: 1,
							createdAt: new Date(),
							updatedAt: new Date()
						}
					])
				)
			};
		})
	}));
	txChain['select'] = vi.fn(() => txChain);
	txChain['from'] = vi.fn(() => txChain);
	txChain['where'] = vi.fn(() => txChain);
	txChain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	txChain['innerJoin'] = vi.fn(() => txChain);
	txChain['delete'] = vi.fn(() => ({
		where: vi.fn(() => {
			mockDeleteWhere();
			return { returning: vi.fn(() => Promise.resolve(new Array(state.txDeleteRows).fill({}))) };
		})
	}));
	txChain['update'] = vi.fn(() => ({
		set: vi.fn((...args: unknown[]) => {
			mockUpdateSet(...args);
			return { where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(state.rows)) })) };
		})
	}));

	chain['transaction'] = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(txChain));
	chain['select'] = vi.fn(() => chain);
	chain['from'] = vi.fn(() => chain);
	chain['where'] = vi.fn(() => chain);
	chain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	chain['innerJoin'] = vi.fn(() => chain);
	chain['orderBy'] = vi.fn(() => Promise.resolve(state.rows));
	chain['insert'] = vi.fn(() => ({
		values: vi.fn((...args: unknown[]) => {
			mockInsertValues(...args);
			return { returning: vi.fn(() => Promise.resolve(state.rows)) };
		})
	}));
	chain['update'] = vi.fn(() => ({
		set: vi.fn((...args: unknown[]) => {
			mockUpdateSet(...args);
			return { where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve(state.rows)) })) };
		})
	}));
	chain['delete'] = vi.fn(() => ({
		where: vi.fn(() => {
			mockDeleteWhere();
			return { returning: vi.fn(() => Promise.resolve(new Array(state.txDeleteRows).fill({}))) };
		})
	}));

	return { db: chain };
});

import {
	createTeam,
	getTeamBySlug,
	getTeamBySlugForAuth,
	getTeamMemberRole,
	updateTeam,
	deleteTeam,
	getUserTeams
} from './teams';

describe('createTeam', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('returns the created team', async () => {
		const team = await createTeam('user-1', { name: 'My Team', slug: 'my-team' });
		expect(team).toMatchObject({ id: 'team-1', slug: 'my-team' });
	});

	it('inserts team + member + activity rows (3 inserts)', async () => {
		await createTeam('user-1', { name: 'My Team', slug: 'my-team' });
		expect(mockInsertValues).toHaveBeenCalledTimes(3);
	});

	it('first insert includes name, slug, ownerId', async () => {
		await createTeam('user-1', { name: 'My Team', slug: 'my-team' });
		const firstCall = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
		expect(firstCall).toMatchObject({ name: 'My Team', slug: 'my-team', ownerId: 'user-1' });
	});

	it('second insert creates admin member row', async () => {
		await createTeam('user-1', { name: 'My Team', slug: 'my-team' });
		const secondCall = mockInsertValues.mock.calls[1][0] as Record<string, unknown>;
		expect(secondCall).toMatchObject({ userId: 'user-1', role: 'admin' });
	});

	it('third insert logs created_team activity', async () => {
		await createTeam('user-1', { name: 'My Team', slug: 'my-team' });
		const thirdCall = mockInsertValues.mock.calls[2][0] as Record<string, unknown>;
		expect(thirdCall).toMatchObject({ userId: 'user-1', actionType: 'created_team' });
	});
});

describe('getTeamBySlug', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when team not found', async () => {
		state.rows = [];
		const result = await getTeamBySlug('nonexistent');
		expect(result).toBeNull();
	});

	it('returns team with setups when found', async () => {
		state.rows = [
			{
				id: 'team-1',
				name: 'My Team',
				slug: 'my-team',
				description: null,
				avatarUrl: null,
				ownerId: 'user-1',
				membersCount: 1,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		];
		const result = await getTeamBySlug('my-team');
		expect(result).not.toBeNull();
		expect(result?.name).toBe('My Team');
		expect(result?.setups).toBeInstanceOf(Array);
	});
});

describe('getTeamBySlugForAuth', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when not found', async () => {
		state.rows = [];
		const result = await getTeamBySlugForAuth('nonexistent');
		expect(result).toBeNull();
	});

	it('returns team with ownerId when found', async () => {
		state.rows = [{ id: 'team-1', name: 'My Team', slug: 'my-team', ownerId: 'user-1' }];
		const result = await getTeamBySlugForAuth('my-team');
		expect(result?.ownerId).toBe('user-1');
	});
});

describe('getTeamMemberRole', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when not a member', async () => {
		state.rows = [];
		const result = await getTeamMemberRole('team-1', 'user-2');
		expect(result).toBeNull();
	});

	it('returns admin role when member is admin', async () => {
		state.rows = [{ role: 'admin' }];
		const result = await getTeamMemberRole('team-1', 'user-1');
		expect(result).toBe('admin');
	});

	it('returns member role when member is not admin', async () => {
		state.rows = [{ role: 'member' }];
		const result = await getTeamMemberRole('team-1', 'user-2');
		expect(result).toBe('member');
	});
});

describe('updateTeam', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when team not found', async () => {
		state.rows = [];
		const result = await updateTeam('team-1', { name: 'New Name' });
		expect(result).toBeNull();
	});

	it('returns updated team', async () => {
		state.rows = [{ id: 'team-1', name: 'New Name', slug: 'my-team' }];
		const result = await updateTeam('team-1', { name: 'New Name' });
		expect(result?.name).toBe('New Name');
	});

	it('passes name to update set', async () => {
		state.rows = [{ id: 'team-1', name: 'New Name' }];
		await updateTeam('team-1', { name: 'New Name' });
		expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
	});
});

describe('deleteTeam', () => {
	beforeEach(() => {
		state.txDeleteRows = 0;
		vi.clearAllMocks();
	});

	it('returns 0 when team not found', async () => {
		state.txDeleteRows = 0;
		const result = await deleteTeam('nonexistent');
		expect(result).toBe(0);
	});

	it('returns 1 when team deleted', async () => {
		state.txDeleteRows = 1;
		const result = await deleteTeam('team-1');
		expect(result).toBe(1);
	});
});

describe('getUserTeams', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when user has no teams', async () => {
		state.rows = [];
		const result = await getUserTeams('user-1');
		expect(result).toEqual([]);
	});

	it('returns teams with role', async () => {
		state.rows = [
			{
				id: 'team-1',
				name: 'My Team',
				slug: 'my-team',
				description: null,
				avatarUrl: null,
				ownerId: 'user-1',
				membersCount: 1,
				role: 'admin',
				joinedAt: new Date()
			}
		];
		const result = await getUserTeams('user-1');
		expect(result).toHaveLength(1);
		expect(result[0].role).toBe('admin');
	});
});
