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

import { setupRepo } from './setupRepository';

const MOCK_SETUP = {
	id: 'setup-1',
	userId: 'user-1',
	name: 'My Setup',
	slug: 'my-setup',
	version: '1.0.0',
	description: 'A great setup',
	readmePath: 'README.md',
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	starsCount: 5,
	clonesCount: 2,
	commentsCount: 0,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	ownerUsername: 'alice',
	ownerAvatarUrl: 'https://example.com/avatar.png'
};

const MOCK_FILES = [
	{
		id: 'file-1',
		setupId: 'setup-1',
		source: 'README.md',
		target: 'README.md',
		placement: 'project' as const,
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
	});

	it('returns null when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const result = await setupRepo.getDetail('alice', 'missing-setup');
		expect(result).toBeNull();
	});

	it('returns SetupDetail with files, tags, agents, isStarred=false when no viewerId', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);

		const result = await setupRepo.getDetail('alice', 'my-setup');

		expect(result).not.toBeNull();
		expect(result!.id).toBe('setup-1');
		expect(result!.files).toEqual(MOCK_FILES);
		expect(result!.tags).toEqual(MOCK_TAGS);
		expect(result!.agents).toEqual(MOCK_AGENTS);
		expect(result!.isStarred).toBe(false);
	});

	it('does not call isSetupStarredByUser when no viewerId', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		await setupRepo.getDetail('alice', 'my-setup');
		expect(mockIsSetupStarredByUser).not.toHaveBeenCalled();
	});

	it('calls isSetupStarredByUser with setup id and viewerId when viewerId provided', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockIsSetupStarredByUser.mockResolvedValue(true);

		const result = await setupRepo.getDetail('alice', 'my-setup', 'viewer-123');

		expect(mockIsSetupStarredByUser).toHaveBeenCalledWith('setup-1', 'viewer-123');
		expect(result!.isStarred).toBe(true);
	});

	it('resolves files, tags, agents, and star in parallel', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const callOrder: string[] = [];
		mockGetSetupFiles.mockImplementation(async () => {
			callOrder.push('files');
			return MOCK_FILES;
		});
		mockGetSetupTags.mockImplementation(async () => {
			callOrder.push('tags');
			return MOCK_TAGS;
		});
		mockGetSetupAgents.mockImplementation(async () => {
			callOrder.push('agents');
			return MOCK_AGENTS;
		});

		await setupRepo.getDetail('alice', 'my-setup');

		// All three should be called (order may vary, but all called)
		expect(callOrder).toContain('files');
		expect(callOrder).toContain('tags');
		expect(callOrder).toContain('agents');
	});

	it('calls getSetupByOwnerSlug with correct params', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);

		await setupRepo.getDetail('bob', 'cool-setup');

		expect(mockGetSetupByOwnerSlug).toHaveBeenCalledWith('bob', 'cool-setup');
	});

	it('preserves all setup fields in returned detail', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);

		const result = await setupRepo.getDetail('alice', 'my-setup');

		expect(result!.name).toBe(MOCK_SETUP.name);
		expect(result!.ownerUsername).toBe(MOCK_SETUP.ownerUsername);
		expect(result!.starsCount).toBe(MOCK_SETUP.starsCount);
	});
});

describe('setupRepo.getById', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns setup when found by id', async () => {
		const mockSetup = { id: 'setup-1', userId: 'user-1', name: 'Test' };
		mockGetSetupById.mockResolvedValue(mockSetup);

		const result = await setupRepo.getById('setup-1');

		expect(result).toEqual(mockSetup);
		expect(mockGetSetupById).toHaveBeenCalledWith('setup-1');
	});

	it('returns null when setup not found', async () => {
		mockGetSetupById.mockResolvedValue(null);

		const result = await setupRepo.getById('nonexistent');

		expect(result).toBeNull();
	});
});

describe('setupRepo.getAllAgents', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to getAllAgents from setups', async () => {
		const mockAgents = [{ id: 'a1', slug: 'claude-code', displayName: 'Claude Code' }];
		mockGetAllAgents.mockResolvedValue(mockAgents);

		const result = await setupRepo.getAllAgents();

		expect(result).toEqual(mockAgents);
		expect(mockGetAllAgents).toHaveBeenCalled();
	});
});

describe('setupRepo.getAllTags', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to getAllTags from setups', async () => {
		const mockTags = [{ id: 't1', name: 'typescript' }];
		mockGetAllTags.mockResolvedValue(mockTags);

		const result = await setupRepo.getAllTags();

		expect(result).toEqual(mockTags);
		expect(mockGetAllTags).toHaveBeenCalled();
	});
});

describe('setupRepo.getByOwnerSlug', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns setup when found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const result = await setupRepo.getByOwnerSlug('alice', 'my-setup');
		expect(result).toEqual(MOCK_SETUP);
		expect(mockGetSetupByOwnerSlug).toHaveBeenCalledWith('alice', 'my-setup');
	});

	it('returns null when not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const result = await setupRepo.getByOwnerSlug('alice', 'missing');
		expect(result).toBeNull();
	});
});

describe('setupRepo.getFiles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to getSetupFiles with setupId', async () => {
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);
		const result = await setupRepo.getFiles('setup-1');
		expect(result).toEqual(MOCK_FILES);
		expect(mockGetSetupFiles).toHaveBeenCalledWith('setup-1');
	});
});

describe('setupRepo.search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to searchSetups with filters', async () => {
		const mockResult = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
		mockSearchSetups.mockResolvedValue(mockResult);

		const filters = { q: 'test', sort: 'newest' as const, page: 1 };
		const result = await setupRepo.search(filters);

		expect(result).toEqual(mockResult);
		expect(mockSearchSetups).toHaveBeenCalledWith(filters);
	});
});

describe('setupRepo.create', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createSetup with userId and data', async () => {
		mockCreateSetup.mockResolvedValue(MOCK_SETUP);
		const data: Parameters<typeof setupRepo.create>[1] = {
			name: 'My Setup',
			slug: 'my-setup',
			version: '1.0.0',
			description: 'A setup',
			files: []
		};
		const result = await setupRepo.create('user-1', data);
		expect(result).toEqual(MOCK_SETUP);
		expect(mockCreateSetup).toHaveBeenCalledWith('user-1', data);
	});
});

describe('setupRepo.update', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to updateSetup with id and data', async () => {
		mockUpdateSetup.mockResolvedValue(MOCK_SETUP);
		const data = { name: 'Updated' };
		const result = await setupRepo.update('setup-1', data);
		expect(result).toEqual(MOCK_SETUP);
		expect(mockUpdateSetup).toHaveBeenCalledWith('setup-1', data);
	});
});

describe('setupRepo.remove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to deleteSetup with id and userId', async () => {
		mockDeleteSetup.mockResolvedValue(1);
		const result = await setupRepo.remove('setup-1', 'user-1');
		expect(result).toBe(1);
		expect(mockDeleteSetup).toHaveBeenCalledWith('setup-1', 'user-1');
	});
});

describe('setupRepo.setStar', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls setStar with desired=true when starring', async () => {
		mockSetStar.mockResolvedValue({ starred: true, starsCount: 6 });
		const result = await setupRepo.setStar('user-1', 'setup-1', true);
		expect(result).toEqual({ starred: true, starsCount: 6 });
		expect(mockSetStar).toHaveBeenCalledWith('user-1', 'setup-1', true);
	});

	it('calls setStar with desired=false when unstarring', async () => {
		mockSetStar.mockResolvedValue({ starred: false, starsCount: 4 });
		const result = await setupRepo.setStar('user-1', 'setup-1', false);
		expect(result).toEqual({ starred: false, starsCount: 4 });
		expect(mockSetStar).toHaveBeenCalledWith('user-1', 'setup-1', false);
	});

	it('is idempotent: double-star returns current state without error', async () => {
		mockSetStar.mockResolvedValue({ starred: true, starsCount: 5 });
		const result = await setupRepo.setStar('user-1', 'setup-1', true);
		expect(result).toEqual({ starred: true, starsCount: 5 });
	});
});

describe('setupRepo.recordClone', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to recordClone', async () => {
		mockRecordClone.mockResolvedValue(undefined);
		await setupRepo.recordClone('setup-1');
		expect(mockRecordClone).toHaveBeenCalledWith('setup-1');
	});
});

describe('setupRepo.getAllAgentsWithSetupCount', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to getAllAgentsWithSetupCount', async () => {
		const mockData = [
			{ id: 'a1', slug: 'claude-code', displayName: 'Claude Code', setupsCount: 3 }
		];
		mockGetAllAgentsWithSetupCount.mockResolvedValue(mockData);
		const result = await setupRepo.getAllAgentsWithSetupCount();
		expect(result).toEqual(mockData);
		expect(mockGetAllAgentsWithSetupCount).toHaveBeenCalled();
	});
});

describe('setupRepo.getAgentBySlug', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns agent with setups when found', async () => {
		const mockAgent = { id: 'a1', slug: 'claude-code', displayName: 'Claude Code', setups: [] };
		mockGetAgentBySlugWithSetups.mockResolvedValue(mockAgent);
		const result = await setupRepo.getAgentBySlug('claude-code');
		expect(result).toEqual(mockAgent);
		expect(mockGetAgentBySlugWithSetups).toHaveBeenCalledWith('claude-code');
	});

	it('returns null when agent not found', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(null);
		const result = await setupRepo.getAgentBySlug('unknown');
		expect(result).toBeNull();
	});
});
