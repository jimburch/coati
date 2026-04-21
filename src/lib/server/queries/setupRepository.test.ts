import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSetupByOwnerSlug = vi.fn();
const mockGetSetupFiles = vi.fn();
const mockGetSetupTags = vi.fn();
const mockGetSetupAgents = vi.fn();
const mockIsSetupStarredByUser = vi.fn();
const mockGetSetupById = vi.fn();
const mockGetAllAgents = vi.fn();
const mockGetAllTags = vi.fn();
const mockCreateSetup = vi.fn();
const mockUpdateSetup = vi.fn();
const mockDeleteSetup = vi.fn();
const mockSetStar = vi.fn();
const mockRecordClone = vi.fn();
const mockSearchSetups = vi.fn();
const mockGetAllAgentsWithSetupCount = vi.fn();
const mockGetAgentBySlugWithSetups = vi.fn();
const mockCanViewSetup = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getSetupByOwnerSlug: (...args: unknown[]) => mockGetSetupByOwnerSlug(...args),
	getSetupFiles: (...args: unknown[]) => mockGetSetupFiles(...args),
	getSetupTags: (...args: unknown[]) => mockGetSetupTags(...args),
	getSetupAgents: (...args: unknown[]) => mockGetSetupAgents(...args),
	isSetupStarredByUser: (...args: unknown[]) => mockIsSetupStarredByUser(...args),
	getSetupById: (...args: unknown[]) => mockGetSetupById(...args),
	getAllAgents: (...args: unknown[]) => mockGetAllAgents(...args),
	getAllTags: (...args: unknown[]) => mockGetAllTags(...args),
	createSetup: (...args: unknown[]) => mockCreateSetup(...args),
	updateSetup: (...args: unknown[]) => mockUpdateSetup(...args),
	deleteSetup: (...args: unknown[]) => mockDeleteSetup(...args),
	setStar: (...args: unknown[]) => mockSetStar(...args),
	recordClone: (...args: unknown[]) => mockRecordClone(...args),
	searchSetups: (...args: unknown[]) => mockSearchSetups(...args),
	getAllAgentsWithSetupCount: (...args: unknown[]) => mockGetAllAgentsWithSetupCount(...args),
	getAgentBySlugWithSetups: (...args: unknown[]) => mockGetAgentBySlugWithSetups(...args)
}));

vi.mock('$lib/server/queries/access', () => ({
	canViewSetup: (...args: unknown[]) => mockCanViewSetup(...args)
}));

import { setupRepo } from './setupRepository';

const MOCK_SETUP = {
	id: 'setup-1',
	userId: 'user-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A great setup',
	readme: null,
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	visibility: 'public' as const,
	teamId: null,
	starsCount: 5,
	clonesCount: 2,
	commentsCount: 0,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	featuredAt: null,
	ownerUsername: 'alice',
	ownerAvatarUrl: 'https://example.com/avatar.png'
};

const MOCK_FILES = [
	{
		id: 'file-1',
		setupId: 'setup-1',
		path: 'README.md',
		componentType: 'instruction' as const,
		description: null,
		content: '# Hello',
		agent: null
	}
];

const MOCK_TAGS = [{ id: 'tag-1', name: 'typescript' }];
const MOCK_AGENTS = [{ id: 'agent-1', displayName: 'Claude Code', slug: 'claude-code' }];

describe('setupRepo.getDetail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);
		mockGetSetupTags.mockResolvedValue(MOCK_TAGS);
		mockGetSetupAgents.mockResolvedValue(MOCK_AGENTS);
		mockIsSetupStarredByUser.mockResolvedValue(false);
		mockCanViewSetup.mockResolvedValue(true);
	});

	it('returns null when setup is missing or access is denied', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		expect(await setupRepo.getDetail('alice', 'missing-setup')).toBeNull();

		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(false);
		expect(await setupRepo.getDetail('alice', 'my-setup', 'other-user')).toBeNull();
		// and no follow-on work is done when denied
		expect(mockGetSetupFiles).not.toHaveBeenCalled();
		expect(mockGetSetupTags).not.toHaveBeenCalled();
		expect(mockGetSetupAgents).not.toHaveBeenCalled();
	});

	it('assembles SetupDetail (files, tags, agents, isStarred) when access is allowed', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockIsSetupStarredByUser.mockResolvedValue(true);

		// Without viewerId: no star lookup, isStarred defaults to false
		const anon = await setupRepo.getDetail('alice', 'my-setup');
		expect(anon).not.toBeNull();
		expect(anon!.id).toBe('setup-1');
		expect(anon!.name).toBe(MOCK_SETUP.name);
		expect(anon!.ownerUsername).toBe(MOCK_SETUP.ownerUsername);
		expect(anon!.starsCount).toBe(MOCK_SETUP.starsCount);
		expect(anon!.files).toEqual(MOCK_FILES);
		expect(anon!.tags).toEqual(MOCK_TAGS);
		expect(anon!.agents).toEqual(MOCK_AGENTS);
		expect(anon!.isStarred).toBe(false);
		expect(mockIsSetupStarredByUser).not.toHaveBeenCalled();
		expect(mockGetSetupByOwnerSlug).toHaveBeenCalledWith('alice', 'my-setup');

		// With viewerId: star + canViewSetup are consulted
		vi.clearAllMocks();
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);
		mockGetSetupTags.mockResolvedValue(MOCK_TAGS);
		mockGetSetupAgents.mockResolvedValue(MOCK_AGENTS);
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockIsSetupStarredByUser.mockResolvedValue(true);
		mockCanViewSetup.mockResolvedValue(true);
		const viewed = await setupRepo.getDetail('alice', 'my-setup', 'viewer-123');
		expect(mockIsSetupStarredByUser).toHaveBeenCalledWith('setup-1', 'viewer-123');
		expect(mockCanViewSetup).toHaveBeenCalledWith(MOCK_SETUP, 'viewer-123');
		expect(viewed!.isStarred).toBe(true);
	});
});

describe('setupRepo — delegating methods', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCanViewSetup.mockResolvedValue(true);
	});

	it('getById + getByOwnerSlug: return data on hit, null on miss or denial', async () => {
		// getById hit
		mockGetSetupById.mockResolvedValue(MOCK_SETUP);
		expect(await setupRepo.getById('setup-1')).toEqual(MOCK_SETUP);
		expect(mockGetSetupById).toHaveBeenCalledWith('setup-1');

		// getById miss
		mockGetSetupById.mockResolvedValue(null);
		expect(await setupRepo.getById('nonexistent')).toBeNull();

		// getById denial
		mockGetSetupById.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(false);
		expect(await setupRepo.getById('setup-1', 'other-user')).toBeNull();

		// getByOwnerSlug hit
		mockCanViewSetup.mockResolvedValue(true);
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		expect(await setupRepo.getByOwnerSlug('alice', 'my-setup')).toEqual(MOCK_SETUP);
		expect(mockGetSetupByOwnerSlug).toHaveBeenCalledWith('alice', 'my-setup');

		// getByOwnerSlug miss
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		expect(await setupRepo.getByOwnerSlug('alice', 'missing')).toBeNull();

		// getByOwnerSlug denial + viewerId threading
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(false);
		expect(await setupRepo.getByOwnerSlug('alice', 'my-setup', 'other-user')).toBeNull();
		expect(mockCanViewSetup).toHaveBeenCalledWith(MOCK_SETUP, 'other-user');
	});

	it('pass-through methods delegate to the underlying query with the right args', async () => {
		mockGetAllAgents.mockResolvedValue([
			{ id: 'a1', slug: 'claude-code', displayName: 'Claude Code' }
		]);
		expect(await setupRepo.getAllAgents()).toHaveLength(1);
		expect(mockGetAllAgents).toHaveBeenCalled();

		mockGetAllTags.mockResolvedValue([{ id: 't1', name: 'typescript' }]);
		expect(await setupRepo.getAllTags()).toHaveLength(1);
		expect(mockGetAllTags).toHaveBeenCalled();

		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);
		expect(await setupRepo.getFiles('setup-1')).toEqual(MOCK_FILES);
		expect(mockGetSetupFiles).toHaveBeenCalledWith('setup-1');

		const searchResult = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
		mockSearchSetups.mockResolvedValue(searchResult);
		const filters = { q: 'test', sort: 'newest' as const, page: 1 };
		expect(await setupRepo.search(filters)).toEqual(searchResult);
		expect(mockSearchSetups).toHaveBeenCalledWith(filters);

		const createData: Parameters<typeof setupRepo.create>[1] = {
			name: 'My Setup',
			slug: 'my-setup',
			description: 'A setup',
			files: []
		};
		mockCreateSetup.mockResolvedValue(MOCK_SETUP);
		expect(await setupRepo.create('user-1', createData)).toEqual(MOCK_SETUP);
		expect(mockCreateSetup).toHaveBeenCalledWith('user-1', createData);

		mockUpdateSetup.mockResolvedValue(MOCK_SETUP);
		expect(await setupRepo.update('setup-1', { name: 'Updated' })).toEqual(MOCK_SETUP);
		expect(mockUpdateSetup).toHaveBeenCalledWith('setup-1', { name: 'Updated' });

		mockDeleteSetup.mockResolvedValue(1);
		expect(await setupRepo.remove('setup-1', 'user-1')).toBe(1);
		expect(mockDeleteSetup).toHaveBeenCalledWith('setup-1', 'user-1');

		mockRecordClone.mockResolvedValue(undefined);
		await setupRepo.recordClone('setup-1');
		expect(mockRecordClone).toHaveBeenCalledWith('setup-1');

		const countsData = [
			{ id: 'a1', slug: 'claude-code', displayName: 'Claude Code', setupsCount: 3 }
		];
		mockGetAllAgentsWithSetupCount.mockResolvedValue(countsData);
		expect(await setupRepo.getAllAgentsWithSetupCount()).toEqual(countsData);
	});

	it('setStar: delegates for star/unstar and is idempotent on repeats', async () => {
		mockSetStar.mockResolvedValue({ starred: true, starsCount: 6 });
		expect(await setupRepo.setStar('user-1', 'setup-1', true)).toEqual({
			starred: true,
			starsCount: 6
		});
		expect(mockSetStar).toHaveBeenLastCalledWith('user-1', 'setup-1', true);

		mockSetStar.mockResolvedValue({ starred: false, starsCount: 4 });
		expect(await setupRepo.setStar('user-1', 'setup-1', false)).toEqual({
			starred: false,
			starsCount: 4
		});
		expect(mockSetStar).toHaveBeenLastCalledWith('user-1', 'setup-1', false);

		// double-star: returns current state without error
		mockSetStar.mockResolvedValue({ starred: true, starsCount: 5 });
		expect(await setupRepo.setStar('user-1', 'setup-1', true)).toEqual({
			starred: true,
			starsCount: 5
		});
	});

	it('getAgentBySlug: returns agent detail on hit, null on miss', async () => {
		const agent = { id: 'a1', slug: 'claude-code', displayName: 'Claude Code', setups: [] };
		mockGetAgentBySlugWithSetups.mockResolvedValue(agent);
		expect(await setupRepo.getAgentBySlug('claude-code')).toEqual(agent);
		expect(mockGetAgentBySlugWithSetups).toHaveBeenCalledWith('claude-code');

		mockGetAgentBySlugWithSetups.mockResolvedValue(null);
		expect(await setupRepo.getAgentBySlug('unknown')).toBeNull();
	});
});
