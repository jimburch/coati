import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import type { Manifest } from '../manifest.js';

// ── hoisted class definitions ─────────────────────────────────────────────────

const { MockApiError } = vi.hoisted(() => {
	class MockApiError extends Error {
		code: string;
		status: number;
		constructor(message: string, code: string, status: number) {
			super(message);
			this.name = 'ApiError';
			this.code = code;
			this.status = status;
		}
	}
	return { MockApiError };
});

// ── mock fs ───────────────────────────────────────────────────────────────────

const mockExistsSync = vi.fn<[string], boolean>();
const mockReadFileSync = vi.fn<[string, string], string>();

vi.mock('fs', () => ({
	default: {
		existsSync: (p: string) => mockExistsSync(p),
		readFileSync: (p: string, enc: string) => mockReadFileSync(p, enc)
	}
}));

// ── mock api ──────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api.js', () => ({
	get: (...args: unknown[]) => mockGet(...args),
	post: (...args: unknown[]) => mockPost(...args),
	patch: (...args: unknown[]) => mockPatch(...args),
	ApiError: MockApiError
}));

// ── mock agents-registry ──────────────────────────────────────────────────────

vi.mock('@magpie/agents-registry', () => ({
	AGENTS_BY_SLUG: {
		'claude-code': { slug: 'claude-code', displayName: 'Claude Code' },
		cursor: { slug: 'cursor', displayName: 'Cursor' },
		codex: { slug: 'codex', displayName: 'Codex' }
	}
}));

// ── mock manifest ─────────────────────────────────────────────────────────────

const mockReadManifest = vi.fn();
const mockWriteManifest = vi.fn();

vi.mock('../manifest.js', () => ({
	readManifest: (dir: string) => mockReadManifest(dir),
	writeManifest: (dir: string, data: unknown) => mockWriteManifest(dir, data),
	MANIFEST_FILENAME: 'setup.json'
}));

// ── mock config ───────────────────────────────────────────────────────────────

const mockGetConfig = vi.fn();

vi.mock('../config.js', () => ({
	getConfig: () => mockGetConfig()
}));

// ── mock auth ─────────────────────────────────────────────────────────────────

const mockIsLoggedIn = vi.fn<[], boolean>();

vi.mock('../auth.js', () => ({
	isLoggedIn: () => mockIsLoggedIn()
}));

// ── mock output ───────────────────────────────────────────────────────────────

const mockSetOutputMode = vi.fn();
const mockIsJsonMode = vi.fn(() => false);
const mockJsonOutput = vi.fn();
const mockPrint = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockInfo = vi.fn();
const mockWarning = vi.fn();

vi.mock('../output.js', () => ({
	setOutputMode: (mode: string) => mockSetOutputMode(mode),
	isJsonMode: () => mockIsJsonMode(),
	json: (data: unknown) => mockJsonOutput(data),
	print: (msg: string) => mockPrint(msg),
	success: (msg: string) => mockSuccess(msg),
	error: (msg: string) => mockError(msg),
	info: (msg: string) => mockInfo(msg),
	warning: (msg: string) => mockWarning(msg)
}));

// ── mock prompts ──────────────────────────────────────────────────────────────

const mockConfirm = vi.fn<[string, boolean?], Promise<boolean>>();

vi.mock('../prompts.js', () => ({
	confirm: (question: string, defaultValue?: boolean) => mockConfirm(question, defaultValue),
	resolveConflict: vi.fn(),
	promptDestination: vi.fn(),
	promptMetadata: vi.fn(),
	confirmFileList: vi.fn(),
	confirmPostInstall: vi.fn(),
	pickFiles: vi.fn()
}));

// ── mock init ─────────────────────────────────────────────────────────────────

const mockRunInitFlow = vi.fn<[string], Promise<boolean>>();

vi.mock('./init.js', () => ({
	runInitFlow: (cwd: string) => mockRunInitFlow(cwd),
	registerInit: vi.fn()
}));

// Import publish command after all mocks are set up
const { registerPublish, validateAgentRefs } = await import('./publish.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride();
	registerPublish(program);
	return program;
}

const MOCK_CONFIG = {
	token: 'test-token',
	username: 'alice',
	apiBase: 'https://magpie.sh/api/v1'
};

const MOCK_MANIFEST = {
	name: 'my-setup',
	version: '1.0.0',
	description: 'A test setup',
	files: [
		{
			source: '.claude/commands/foo.md',
			target: '.claude/commands/foo.md',
			placement: 'global',
			componentType: 'command'
		}
	]
};

const MOCK_SETUP_RESPONSE = {
	id: 'setup-123',
	slug: 'my-setup',
	name: 'my-setup',
	ownerUsername: 'alice'
};

// ── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfig.mockReturnValue(MOCK_CONFIG);
	mockIsLoggedIn.mockReturnValue(true);
	mockIsJsonMode.mockReturnValue(false);
	mockExistsSync.mockReturnValue(true);
	mockReadManifest.mockReturnValue(MOCK_MANIFEST);
	mockReadFileSync.mockReturnValue('file content here');
	// Default: setup doesn't exist (404)
	mockGet.mockRejectedValue(new MockApiError('Not Found', 'NOT_FOUND', 404));
	mockPost.mockResolvedValue(MOCK_SETUP_RESPONSE);
	mockPatch.mockResolvedValue(MOCK_SETUP_RESPONSE);
	mockRunInitFlow.mockResolvedValue(true);
	mockConfirm.mockResolvedValue(true);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── authentication ────────────────────────────────────────────────────────────

describe('authentication', () => {
	it('errors and exits with code 1 when not logged in', async () => {
		mockIsLoggedIn.mockReturnValue(false);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('magpie login'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

// ── missing setup.json ────────────────────────────────────────────────────────

describe('missing setup.json', () => {
	beforeEach(() => {
		mockExistsSync.mockReturnValue(false);
	});

	it('errors and exits in JSON mode', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish', '--json'])).rejects.toThrow(
			'process.exit'
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('setup.json'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('auto-runs init flow in text mode', async () => {
		mockRunInitFlow.mockResolvedValue(true);
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockRunInitFlow).toHaveBeenCalled();
		expect(mockPost).toHaveBeenCalled();
	});

	it('exits cleanly (code 0) when init is cancelled', async () => {
		mockRunInitFlow.mockResolvedValue(false);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('errors with code 1 when init throws', async () => {
		mockRunInitFlow.mockRejectedValue(new Error('Setup name is required.'));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Setup name is required'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

// ── create new setup (POST) ───────────────────────────────────────────────────

describe('create new setup', () => {
	it('calls POST /setups when setup does not exist', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockPost).toHaveBeenCalledWith(
			'/setups',
			expect.objectContaining({
				name: 'my-setup',
				slug: 'my-setup',
				description: 'A test setup',
				version: '1.0.0',
				files: expect.arrayContaining([
					expect.objectContaining({
						source: '.claude/commands/foo.md',
						target: '.claude/commands/foo.md',
						placement: 'global',
						componentType: 'command',
						content: 'file content here'
					})
				])
			})
		);
		expect(mockPatch).not.toHaveBeenCalled();
	});

	it('displays success message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('published'));
		expect(mockPrint).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});
});

// ── update existing setup (PATCH) ─────────────────────────────────────────────

describe('update existing setup', () => {
	beforeEach(() => {
		mockGet.mockResolvedValue(MOCK_SETUP_RESPONSE);
	});

	it('calls PATCH /setups/{owner}/{slug} when setup exists', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockPatch).toHaveBeenCalledWith(
			'/setups/alice/my-setup',
			expect.objectContaining({
				name: 'my-setup',
				files: expect.arrayContaining([expect.objectContaining({ content: 'file content here' })])
			})
		);
		expect(mockPost).not.toHaveBeenCalled();
	});

	it('displays updated message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('updated'));
		expect(mockPrint).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});
});

// ── --json mode ───────────────────────────────────────────────────────────────

describe('--json mode', () => {
	it('calls setOutputMode("json") when --json is passed', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish', '--json']);

		expect(mockSetOutputMode).toHaveBeenCalledWith('json');
	});

	it('outputs structured JSON on successful create', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish', '--json']);

		expect(mockJsonOutput).toHaveBeenCalledWith({
			action: 'created',
			owner: 'alice',
			slug: 'my-setup',
			url: expect.stringContaining('alice/my-setup')
		});
	});

	it('outputs structured JSON on successful update', async () => {
		mockIsJsonMode.mockReturnValue(true);
		mockGet.mockResolvedValue(MOCK_SETUP_RESPONSE);
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish', '--json']);

		expect(mockJsonOutput).toHaveBeenCalledWith({
			action: 'updated',
			owner: 'alice',
			slug: 'my-setup',
			url: expect.stringContaining('alice/my-setup')
		});
	});
});

// ── agent validation ──────────────────────────────────────────────────────────

describe('validateAgentRefs', () => {
	const CWD = '/fake/cwd';

	function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
		return {
			name: 'my-setup',
			version: '1.0.0',
			description: 'test',
			files: [],
			...overrides
		};
	}

	it('returns manifest unchanged when no files have agent fields', async () => {
		const manifest = makeManifest({
			files: [{ source: 'README.md', target: 'README.md', placement: 'project' }]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).toEqual(manifest);
		expect(mockError).not.toHaveBeenCalled();
	});

	it('returns manifest unchanged when all file agents are in agents array', async () => {
		const manifest = makeManifest({
			agents: ['claude-code'],
			files: [
				{
					source: 'CLAUDE.md',
					target: 'CLAUDE.md',
					placement: 'project',
					agent: 'claude-code'
				}
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).toEqual(manifest);
		expect(mockError).not.toHaveBeenCalled();
		expect(mockConfirm).not.toHaveBeenCalled();
	});

	it('returns null and errors for unknown agent slug', async () => {
		const manifest = makeManifest({
			files: [{ source: '.foo', target: '.foo', placement: 'project', agent: 'totally-unknown' }]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).toBeNull();
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('totally-unknown'));
	});

	it('returns null for multiple unknown agent slugs', async () => {
		const manifest = makeManifest({
			files: [
				{ source: '.foo', target: '.foo', placement: 'project', agent: 'bad-agent-1' },
				{ source: '.bar', target: '.bar', placement: 'project', agent: 'bad-agent-2' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).toBeNull();
		expect(mockError).toHaveBeenCalledTimes(2);
	});

	it('warns and offers to add missing agent when not in agents array', async () => {
		mockConfirm.mockResolvedValue(false);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).not.toBeNull();
		expect(mockError).not.toHaveBeenCalled();
		expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('cursor'));
		expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('cursor'), true);
	});

	it('adds agent to agents array when user confirms auto-fix', async () => {
		mockConfirm.mockResolvedValue(true);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).toContain('cursor');
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ agents: expect.arrayContaining(['cursor']) })
		);
	});

	it('does not update agents array when user declines auto-fix', async () => {
		mockConfirm.mockResolvedValue(false);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).not.toContain('cursor');
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('handles multiple missing agents with mixed confirm/decline', async () => {
		mockConfirm
			.mockResolvedValueOnce(true) // accept claude-code
			.mockResolvedValueOnce(false); // decline cursor
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: 'CLAUDE.md', target: 'CLAUDE.md', placement: 'project', agent: 'claude-code' },
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).toContain('claude-code');
		expect(result!.agents).not.toContain('cursor');
	});

	it('skips auto-fix prompts in JSON mode', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(manifest, CWD);
		expect(result).not.toBeNull();
		expect(mockConfirm).not.toHaveBeenCalled();
	});
});

// ── agent validation via publish command ──────────────────────────────────────

describe('agent validation during publish', () => {
	it('blocks publish when a file references an unknown agent slug', async () => {
		mockReadManifest.mockReturnValue({
			...MOCK_MANIFEST,
			files: [
				{
					source: '.claude/commands/foo.md',
					target: '.claude/commands/foo.md',
					placement: 'global',
					componentType: 'command',
					agent: 'nonexistent-agent'
				}
			]
		});
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('nonexistent-agent'));
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(mockPost).not.toHaveBeenCalled();
	});

	it('offers auto-fix when file agent is missing from agents array, and publishes after accepting', async () => {
		mockConfirm.mockResolvedValue(true);
		mockReadManifest.mockReturnValue({
			...MOCK_MANIFEST,
			agents: [],
			files: [
				{
					source: '.cursorrules',
					target: '.cursorrules',
					placement: 'project',
					agent: 'cursor'
				}
			]
		});
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('cursor'), true);
		expect(mockPost).toHaveBeenCalled();
	});

	it('still publishes when user declines auto-fix for missing agent', async () => {
		mockConfirm.mockResolvedValue(false);
		mockReadManifest.mockReturnValue({
			...MOCK_MANIFEST,
			agents: [],
			files: [
				{
					source: '.cursorrules',
					target: '.cursorrules',
					placement: 'project',
					agent: 'cursor'
				}
			]
		});
		const program = makeProgram();
		await program.parseAsync(['node', 'magpie', 'publish']);

		expect(mockPost).toHaveBeenCalled();
	});
});

// ── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
	it('errors and exits when a referenced file cannot be read', async () => {
		mockReadFileSync.mockImplementation(() => {
			throw new Error('ENOENT: no such file');
		});
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('.claude/commands/foo.md'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('errors and exits when manifest is invalid', async () => {
		mockReadManifest.mockImplementation(() => {
			throw new Error('Invalid setup.json:\n  name: Required');
		});
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid setup.json'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows re-authentication hint on 401 error', async () => {
		mockPost.mockRejectedValue(new MockApiError('Unauthorized', 'UNAUTHORIZED', 401));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('magpie login'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows validation message on 422 error', async () => {
		mockPost.mockRejectedValue(new MockApiError('Slug already taken', 'SLUG_TAKEN', 422));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows error message on network failure', async () => {
		mockPost.mockRejectedValue(new Error('Network error: unable to reach server'));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'magpie', 'publish'])).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Network error'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});
