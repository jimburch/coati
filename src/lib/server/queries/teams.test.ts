import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTeamSchema, updateTeamSchema, changeTeamMemberRoleSchema } from '$lib/types';

// ── Schema tests (no DB needed) ───────────────────────────────────────────────

describe('createTeamSchema', () => {
	const base = { name: 'My Team', slug: 'my-team' };

	it('accepts valid input with and without description', () => {
		expect(createTeamSchema.safeParse({ ...base, description: 'A great team' }).success).toBe(true);
		expect(createTeamSchema.safeParse(base).success).toBe(true);
	});

	it('rejects invalid input (name, slug, description constraints)', () => {
		expect(createTeamSchema.safeParse({ ...base, name: '' }).success).toBe(false);
		expect(createTeamSchema.safeParse({ ...base, name: 'a'.repeat(101) }).success).toBe(false);
		expect(createTeamSchema.safeParse({ ...base, slug: 'My Team!' }).success).toBe(false);
		expect(createTeamSchema.safeParse({ ...base, slug: 'MyTeam' }).success).toBe(false);
		expect(createTeamSchema.safeParse({ ...base, description: 'a'.repeat(301) }).success).toBe(
			false
		);
	});
});

describe('updateTeamSchema', () => {
	it('accepts partial updates, null clears, and empty object', () => {
		expect(updateTeamSchema.safeParse({ name: 'New Name' }).success).toBe(true);
		expect(updateTeamSchema.safeParse({ description: null }).success).toBe(true);
		expect(updateTeamSchema.safeParse({ avatarUrl: null }).success).toBe(true);
		expect(updateTeamSchema.safeParse({}).success).toBe(true);
	});

	it('rejects invalid avatarUrl', () => {
		expect(updateTeamSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
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
	desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
	sql: vi.fn(() => ({ _type: 'sql' })),
	count: vi.fn(() => ({ _type: 'count' }))
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
		avatarUrl: 'users.avatarUrl',
		name: 'users.name'
	},
	activities: {
		userId: 'activities.userId',
		teamId: 'activities.teamId',
		actionType: 'activities.actionType'
	},
	teamInvites: {
		id: 'teamInvites.id',
		teamId: 'teamInvites.teamId',
		invitedByUserId: 'teamInvites.invitedByUserId',
		invitedUserId: 'teamInvites.invitedUserId',
		status: 'teamInvites.status',
		token: 'teamInvites.token',
		expiresAt: 'teamInvites.expiresAt',
		createdAt: 'teamInvites.createdAt'
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
	txChain['leftJoin'] = vi.fn(() => txChain);
	txChain['orderBy'] = vi.fn(() => Promise.resolve(state.rows));
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
	chain['leftJoin'] = vi.fn(() => chain);
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
	getUserTeams,
	getTeamMembers,
	removeTeamMember,
	changeTeamMemberRole,
	leaveTeam
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

describe('getTeamMembers', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when team has no members', async () => {
		state.rows = [];
		const result = await getTeamMembers('team-1');
		expect(result).toEqual([]);
	});

	it('returns members with user info', async () => {
		state.rows = [
			{
				userId: 'user-1',
				role: 'admin',
				joinedAt: new Date(),
				username: 'alice',
				avatarUrl: 'https://example.com/avatar.png',
				name: 'Alice'
			}
		];
		const result = await getTeamMembers('team-1');
		expect(result).toHaveLength(1);
		expect(result[0].username).toBe('alice');
		expect(result[0].role).toBe('admin');
	});
});

describe('removeTeamMember', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('calls update on setups to reassign to owner', async () => {
		await removeTeamMember('team-1', 'user-2', 'user-1');
		expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
	});

	it('calls delete on teamMembers', async () => {
		await removeTeamMember('team-1', 'user-2', 'user-1');
		expect(mockDeleteWhere).toHaveBeenCalled();
	});

	it('decrements membersCount via second update call', async () => {
		await removeTeamMember('team-1', 'user-2', 'user-1');
		expect(mockUpdateSet).toHaveBeenCalledTimes(2);
	});

	it('logs left_team activity', async () => {
		await removeTeamMember('team-1', 'user-2', 'user-1');
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-2', actionType: 'left_team' })
		);
	});
});

describe('changeTeamMemberRole', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when member not found', async () => {
		state.rows = [];
		const result = await changeTeamMemberRole('team-1', 'user-1', 'admin');
		expect(result).toBeNull();
	});

	it('returns updated member when found', async () => {
		state.rows = [{ teamId: 'team-1', userId: 'user-1', role: 'admin', joinedAt: new Date() }];
		const result = await changeTeamMemberRole('team-1', 'user-1', 'admin');
		expect(result).not.toBeNull();
		expect(result?.role).toBe('admin');
	});

	it('passes role to update set', async () => {
		state.rows = [{ teamId: 'team-1', userId: 'user-1', role: 'member', joinedAt: new Date() }];
		await changeTeamMemberRole('team-1', 'user-1', 'member');
		expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ role: 'member' }));
	});
});

describe('leaveTeam', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('delegates to removeTeamMember (calls delete and logs activity)', async () => {
		await leaveTeam('team-1', 'user-2', 'user-1');
		expect(mockDeleteWhere).toHaveBeenCalled();
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-2', actionType: 'left_team' })
		);
	});
});

describe('changeTeamMemberRoleSchema', () => {
	it('accepts admin and member roles', () => {
		expect(changeTeamMemberRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
		expect(changeTeamMemberRoleSchema.safeParse({ role: 'member' }).success).toBe(true);
	});

	it('rejects invalid or missing role', () => {
		expect(changeTeamMemberRoleSchema.safeParse({ role: 'superadmin' }).success).toBe(false);
		expect(changeTeamMemberRoleSchema.safeParse({}).success).toBe(false);
	});
});

import { getTeamByIdForAuth, getTeamSetupBySlug, getTeamSetups } from './teams';

describe('getTeamByIdForAuth', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when team not found', async () => {
		state.rows = [];
		const result = await getTeamByIdForAuth('nonexistent-id');
		expect(result).toBeNull();
	});

	it('returns team with id, name, slug, ownerId when found', async () => {
		state.rows = [{ id: 'team-1', name: 'My Team', slug: 'my-team', ownerId: 'user-1' }];
		const result = await getTeamByIdForAuth('team-1');
		expect(result).not.toBeNull();
		expect(result?.id).toBe('team-1');
		expect(result?.ownerId).toBe('user-1');
	});
});

describe('getTeamSetupBySlug', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when setup not found', async () => {
		state.rows = [];
		const result = await getTeamSetupBySlug('my-team', 'nonexistent-setup');
		expect(result).toBeNull();
	});

	it('returns setup with team info when found', async () => {
		state.rows = [
			{
				id: 'setup-1',
				userId: 'user-1',
				name: 'My Setup',
				slug: 'my-setup',
				description: 'A setup',
				display: null,
				readme: null,
				category: null,
				license: null,
				minToolVersion: null,
				postInstall: null,
				prerequisites: null,
				visibility: 'private',
				teamId: 'team-1',
				starsCount: 0,
				clonesCount: 0,
				commentsCount: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				featuredAt: null,
				ownerUsername: 'alice',
				ownerAvatarUrl: null,
				teamName: 'My Team',
				teamSlug: 'my-team',
				teamAvatarUrl: null
			}
		];
		const result = await getTeamSetupBySlug('my-team', 'my-setup');
		expect(result).not.toBeNull();
		expect(result?.teamName).toBe('My Team');
		expect(result?.teamSlug).toBe('my-team');
		expect(result?.visibility).toBe('private');
	});
});

describe('getTeamSetups', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when team has no setups', async () => {
		state.rows = [];
		const result = await getTeamSetups('team-1', false);
		expect(result).toEqual([]);
	});

	it('returns setups when team has setups', async () => {
		state.rows = [
			{
				id: 'setup-1',
				name: 'My Setup',
				slug: 'my-setup',
				description: 'A setup',
				display: null,
				starsCount: 0,
				clonesCount: 0,
				updatedAt: new Date(),
				teamSlug: 'my-team',
				teamName: 'My Team',
				teamAvatarUrl: null,
				ownerUsername: 'alice',
				ownerAvatarUrl: null
			}
		];
		const result = await getTeamSetups('team-1', true);
		expect(result).toHaveLength(1);
		expect(result[0].teamName).toBe('My Team');
	});
});

describe('getTeamBySlug with viewerId (member visibility)', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns team with setups when viewerId is provided', async () => {
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
		const result = await getTeamBySlug('my-team', 'user-1');
		expect(result).not.toBeNull();
		expect(result?.setups).toBeInstanceOf(Array);
	});

	it('returns team without viewerId (backward-compatible)', async () => {
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
		expect(result?.setups).toBeInstanceOf(Array);
	});
});

import {
	createInviteByUsername,
	acceptInvite,
	declineInvite,
	getPendingInvites,
	getTeamPendingInviteCount,
	createInviteLink
} from './teams';
import { createInviteSchema } from '$lib/types';
import { db } from '$lib/server/db';

describe('createInviteSchema', () => {
	it('accepts valid username', () => {
		expect(createInviteSchema.safeParse({ username: 'alice' }).success).toBe(true);
	});

	it('rejects invalid usernames (empty, too long, missing)', () => {
		expect(createInviteSchema.safeParse({ username: '' }).success).toBe(false);
		expect(createInviteSchema.safeParse({ username: 'a'.repeat(51) }).success).toBe(false);
		expect(createInviteSchema.safeParse({}).success).toBe(false);
	});
});

describe('getTeamPendingInviteCount', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns 0 when no pending invites exist', async () => {
		state.rows = [];
		const result = await getTeamPendingInviteCount('team-1');
		expect(result).toBe(0);
	});

	it('returns count from rows', async () => {
		state.rows = [{ count: 7 }];
		const result = await getTeamPendingInviteCount('team-1');
		expect(result).toBe(7);
	});
});

describe('createInviteByUsername', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('returns NOT_FOUND when user does not exist', async () => {
		state.rows = [];
		const result = await createInviteByUsername('team-1', 'inviter-id', 'nonexistent');
		expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
	});

	it('returns ALREADY_MEMBER when user is already a team member', async () => {
		// First query (user lookup) returns user; second (member check) also returns non-empty
		state.rows = [{ id: 'user-1' }];
		const result = await createInviteByUsername('team-1', 'inviter-id', 'alice');
		expect(result).toMatchObject({ ok: false, code: 'ALREADY_MEMBER' });
	});
});

describe('acceptInvite', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('returns NOT_FOUND when invite does not exist', async () => {
		state.rows = [];
		const result = await acceptInvite('bad-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
	});

	it('returns FORBIDDEN when invite belongs to different user', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'other-user',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await acceptInvite('some-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
	});

	it('returns INVALID_STATUS when invite is not pending', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'accepted',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await acceptInvite('some-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'INVALID_STATUS' });
	});

	it('returns EXPIRED when invite has passed its expiry date', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'pending',
				expiresAt: new Date(Date.now() - 1000)
			}
		];
		const result = await acceptInvite('some-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'EXPIRED' });
	});

	it('inserts member row and logs activity on success', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await acceptInvite('valid-token', 'user-1');
		expect(result).toMatchObject({ ok: true });
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({ teamId: 'team-1', userId: 'user-1', role: 'member' })
		);
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-1', actionType: 'joined_team' })
		);
	});

	it('updates invite status to accepted on success', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		await acceptInvite('valid-token', 'user-1');
		expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
	});
});

describe('declineInvite', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns NOT_FOUND when invite does not exist', async () => {
		state.rows = [];
		const result = await declineInvite('bad-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'NOT_FOUND' });
	});

	it('returns FORBIDDEN when invite belongs to different user', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'other-user',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await declineInvite('some-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'FORBIDDEN' });
	});

	it('returns INVALID_STATUS when invite is not pending', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'declined',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await declineInvite('some-token', 'user-1');
		expect(result).toMatchObject({ ok: false, code: 'INVALID_STATUS' });
	});

	it('updates status to declined on success', async () => {
		state.rows = [
			{
				id: 'invite-1',
				teamId: 'team-1',
				invitedUserId: 'user-1',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000)
			}
		];
		const result = await declineInvite('valid-token', 'user-1');
		expect(result).toMatchObject({ ok: true });
		expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'declined' }));
	});
});

describe('getPendingInvites', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when user has no pending invites', async () => {
		state.rows = [];
		const result = await getPendingInvites('user-1');
		expect(result).toEqual([]);
	});

	it('returns pending invites with team info', async () => {
		state.rows = [
			{
				id: 'invite-1',
				token: 'tok123',
				status: 'pending',
				expiresAt: new Date(Date.now() + 86400000),
				createdAt: new Date(),
				teamId: 'team-1',
				teamName: 'My Team',
				teamSlug: 'my-team',
				teamAvatarUrl: null,
				invitedByUsername: 'alice',
				invitedByAvatarUrl: null
			}
		];
		const result = await getPendingInvites('user-1');
		expect(result).toHaveLength(1);
		expect(result[0].teamName).toBe('My Team');
		expect(result[0].invitedByUsername).toBe('alice');
	});
});

describe('createInviteLink', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('returns ok with token on success', async () => {
		state.rows = [{ id: 'invite-1', token: 'abc123', teamId: 'team-1' }];
		const result = await createInviteLink('team-1', 'user-1');
		expect(result).toMatchObject({ ok: true, token: 'abc123' });
	});

	it('logs invited_to_team activity after creating invite link', async () => {
		state.rows = [{ id: 'invite-1', token: 'abc123', teamId: 'team-1' }];
		await createInviteLink('team-1', 'user-1');
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				teamId: 'team-1',
				actionType: 'invited_to_team'
			})
		);
	});

	it('does not set targetUserId for link invites (anyone can accept)', async () => {
		state.rows = [{ id: 'invite-1', token: 'abc123', teamId: 'team-1' }];
		await createInviteLink('team-1', 'user-1');
		const activityCall = mockInsertValues.mock.calls.find(
			(call) => call[0]?.actionType === 'invited_to_team'
		);
		expect(activityCall).toBeDefined();
		expect(activityCall![0]).not.toHaveProperty('targetUserId');
	});
});

describe('createInviteByUsername invited_to_team activity', () => {
	beforeEach(() => {
		state.rows = [];
		state.txInsertCalls = [];
		vi.clearAllMocks();
	});

	it('logs invited_to_team with targetUserId when invite is created successfully', async () => {
		// Override limit() to return different values for each sequential select query.
		// Cast through unknown because the mock replaces db with a plain chain object.
		const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;
		mockDb['limit']
			.mockResolvedValueOnce([{ id: 'target-user-id' }]) // user found
			.mockResolvedValueOnce([]) // not a member
			.mockResolvedValueOnce([]) // no existing invite
			.mockResolvedValueOnce([{ count: 0 }]); // pending count = 0

		state.rows = [
			{ id: 'invite-1', token: 'tok123', teamId: 'team-1', invitedUserId: 'target-user-id' }
		];

		const result = await createInviteByUsername('team-1', 'inviter-id', 'targetuser');

		expect(result).toMatchObject({ ok: true });
		expect(mockInsertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'inviter-id',
				teamId: 'team-1',
				targetUserId: 'target-user-id',
				actionType: 'invited_to_team'
			})
		);
	});
});
