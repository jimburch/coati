import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDbSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

// Build a chainable mock: db.select().from().where().limit()
mockLimit.mockResolvedValue([]);
mockWhere.mockReturnValue({ limit: mockLimit });
mockFrom.mockReturnValue({ where: mockWhere });
mockDbSelect.mockReturnValue({ from: mockFrom });

vi.mock('$lib/server/db', () => ({
	db: {
		select: (...args: unknown[]) => mockDbSelect(...args)
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	teamMembers: {
		teamId: 'team_members.team_id',
		userId: 'team_members.user_id',
		id: 'team_members.id'
	},
	setupShares: {
		setupId: 'setup_shares.setup_id',
		sharedWithUserId: 'setup_shares.shared_with_user_id',
		id: 'setup_shares.id'
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
	and: (...args: unknown[]) => ({ op: 'and', args })
}));

import { canViewSetup } from './access';

type AccessSetup = Parameters<typeof canViewSetup>[0];

const PUBLIC_SETUP: AccessSetup = {
	id: 'setup-1',
	visibility: 'public',
	userId: 'owner-1',
	teamId: null
};

const PRIVATE_SETUP: AccessSetup = {
	id: 'setup-1',
	visibility: 'private',
	userId: 'owner-1',
	teamId: null
};

const TEAM_PRIVATE_SETUP: AccessSetup = {
	id: 'setup-1',
	visibility: 'private',
	userId: 'owner-1',
	teamId: 'team-1'
};

describe('canViewSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLimit.mockResolvedValue([]);
		mockWhere.mockReturnValue({ limit: mockLimit });
		mockFrom.mockReturnValue({ where: mockWhere });
		mockDbSelect.mockReturnValue({ from: mockFrom });
	});

	describe('public setups', () => {
		it('allows anonymous viewer (null viewerId)', async () => {
			expect(await canViewSetup(PUBLIC_SETUP, null)).toBe(true);
		});

		it('allows anonymous viewer (undefined viewerId)', async () => {
			expect(await canViewSetup(PUBLIC_SETUP, undefined)).toBe(true);
		});

		it('allows any authenticated viewer', async () => {
			expect(await canViewSetup(PUBLIC_SETUP, 'some-user-id')).toBe(true);
		});

		it('does not query the database for public setups', async () => {
			await canViewSetup(PUBLIC_SETUP, 'some-user-id');
			expect(mockDbSelect).not.toHaveBeenCalled();
		});
	});

	describe('private setups - owner access', () => {
		it('allows the setup owner', async () => {
			expect(await canViewSetup(PRIVATE_SETUP, 'owner-1')).toBe(true);
		});

		it('does not query the database when viewer is owner', async () => {
			await canViewSetup(PRIVATE_SETUP, 'owner-1');
			expect(mockDbSelect).not.toHaveBeenCalled();
		});
	});

	describe('private setups - anonymous denial', () => {
		it('denies null viewerId', async () => {
			expect(await canViewSetup(PRIVATE_SETUP, null)).toBe(false);
		});

		it('denies undefined viewerId', async () => {
			expect(await canViewSetup(PRIVATE_SETUP, undefined)).toBe(false);
		});

		it('does not query the database for anonymous viewers', async () => {
			await canViewSetup(PRIVATE_SETUP, null);
			expect(mockDbSelect).not.toHaveBeenCalled();
		});
	});

	describe('private setups - non-member denial', () => {
		it('denies viewer with no share and no team membership', async () => {
			// mockLimit returns [] (no shares, no team membership)
			expect(await canViewSetup(PRIVATE_SETUP, 'other-user')).toBe(false);
		});
	});

	describe('private team setups - team member access', () => {
		it('allows a team member', async () => {
			// First query (team membership) returns a row
			mockLimit.mockResolvedValueOnce([{ id: 'member-row' }]);
			expect(await canViewSetup(TEAM_PRIVATE_SETUP, 'member-user')).toBe(true);
		});

		it('denies a non-team-member with no shares', async () => {
			// Both queries return empty arrays
			mockLimit.mockResolvedValue([]);
			expect(await canViewSetup(TEAM_PRIVATE_SETUP, 'outsider-user')).toBe(false);
		});

		it('checks team membership before setup shares', async () => {
			mockLimit.mockResolvedValueOnce([{ id: 'member-row' }]);
			await canViewSetup(TEAM_PRIVATE_SETUP, 'member-user');
			// Should call db.select at least once (for team membership)
			expect(mockDbSelect).toHaveBeenCalledTimes(1);
		});

		it('does not check team membership when teamId is null', async () => {
			// Private setup with no teamId - goes straight to shares check
			mockLimit.mockResolvedValue([]);
			await canViewSetup(PRIVATE_SETUP, 'other-user');
			// Should only query setupShares (once)
			expect(mockDbSelect).toHaveBeenCalledTimes(1);
		});
	});

	describe('private setups - share-based access', () => {
		it('allows viewer with a setup_shares row', async () => {
			// No team, but share exists
			mockLimit.mockResolvedValueOnce([{ id: 'share-row' }]);
			expect(await canViewSetup(PRIVATE_SETUP, 'shared-user')).toBe(true);
		});

		it('allows viewer with share even on a team setup (team miss, share hit)', async () => {
			// Team check returns empty, share check returns a row
			mockLimit.mockResolvedValueOnce([]); // team membership miss
			mockLimit.mockResolvedValueOnce([{ id: 'share-row' }]); // share hit
			expect(await canViewSetup(TEAM_PRIVATE_SETUP, 'shared-user')).toBe(true);
		});
	});
});
