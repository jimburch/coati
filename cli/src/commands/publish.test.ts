import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import type { Manifest } from '../manifest.js';
import { createTestContext } from '../test-utils.js';
import { ApiError } from '../context.js';

// ── mock agents-registry (pure utility) ───────────────────────────────────────

vi.mock('@coati/agents-registry', () => ({
	AGENTS_BY_SLUG: {
		'claude-code': { slug: 'claude-code', displayName: 'Claude Code' },
		cursor: { slug: 'cursor', displayName: 'Cursor' },
		codex: { slug: 'codex', displayName: 'Codex' }
	}
}));

// ── mock manifest (pure utility) ──────────────────────────────────────────────

const mockReadManifest = vi.fn();
const mockWriteManifest = vi.fn();

vi.mock('../manifest.js', () => ({
	readManifest: (dir: string) => mockReadManifest(dir),
	writeManifest: (dir: string, data: unknown) => mockWriteManifest(dir, data),
	MANIFEST_FILENAME: 'coati.json'
}));

// ── mock init (runInitFlow — has side effects, must be isolated) ───────────────

const mockRunInitFlow = vi.fn();

vi.mock('./init.js', () => ({
	runInitFlow: (...args: unknown[]) => mockRunInitFlow(...args),
	registerInit: vi.fn()
}));

// ── mock fs (readFileSync — raw disk read, not in FsClient) ──────────────────

const mockReadFileSync = vi.fn<[string, string], string>();

vi.mock('fs', () => ({
	default: {
		readFileSync: (p: string, enc: string) => mockReadFileSync(p, enc)
	}
}));

// Import publish command after all mocks are set up
const { registerPublish, validateAgentRefs } = await import('./publish.js');

// ── helpers ───────────────────────────────────────────────────────────────────

const MOCK_CONFIG = {
	token: 'test-token',
	username: 'alice',
	apiBase: 'https://coati.sh/api/v1'
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

let ctx: ReturnType<typeof createTestContext>;

function makeProgram() {
	const program = new Command();
	program.exitOverride();
	registerPublish(program, ctx);
	return program;
}

// ── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	ctx = createTestContext({
		auth: {
			isLoggedIn: vi.fn(() => true),
			getUsername: vi.fn(() => 'alice')
		},
		fs: {
			existsSync: vi.fn(() => true),
			readConfig: vi.fn(() => MOCK_CONFIG)
		},
		io: { isJson: vi.fn(() => false) }
	});
	mockReadManifest.mockReturnValue(MOCK_MANIFEST);
	mockReadFileSync.mockReturnValue('file content here');
	// Default: setup doesn't exist (404)
	vi.mocked(ctx.api.get).mockRejectedValue(new ApiError('Not Found', 'NOT_FOUND', 404));
	vi.mocked(ctx.api.post).mockResolvedValue(MOCK_SETUP_RESPONSE);
	vi.mocked(ctx.api.patch).mockResolvedValue(MOCK_SETUP_RESPONSE);
	mockRunInitFlow.mockResolvedValue(true);
	vi.mocked(ctx.io.confirm).mockResolvedValue(true);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── authentication ────────────────────────────────────────────────────────────

describe('authentication', () => {
	it('errors and exits with code 1 when not logged in', async () => {
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(false);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('coati login'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

// ── missing setup.json ────────────────────────────────────────────────────────

describe('missing setup.json', () => {
	beforeEach(() => {
		vi.mocked(ctx.fs.existsSync).mockReturnValue(false);
	});

	it('errors and exits in JSON mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish', '--json'])).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('coati.json'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('auto-runs init flow in text mode', async () => {
		mockRunInitFlow.mockResolvedValue(true);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(mockRunInitFlow).toHaveBeenCalled();
		expect(ctx.api.post).toHaveBeenCalled();
	});

	it('exits cleanly (code 0) when init is cancelled', async () => {
		mockRunInitFlow.mockResolvedValue(false);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('errors with code 1 when init throws', async () => {
		mockRunInitFlow.mockRejectedValue(new Error('Setup name is required.'));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Setup name is required'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

// ── create new setup (POST) ───────────────────────────────────────────────────

describe('create new setup', () => {
	it('calls POST /setups when setup does not exist', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalledWith(
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
		expect(ctx.api.patch).not.toHaveBeenCalled();
	});

	it('displays success message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('published'));
		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});
});

// ── update existing setup (PATCH) ─────────────────────────────────────────────

describe('update existing setup', () => {
	beforeEach(() => {
		vi.mocked(ctx.api.get).mockResolvedValue(MOCK_SETUP_RESPONSE);
	});

	it('calls PATCH /setups/{owner}/{slug} when setup exists', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.patch).toHaveBeenCalledWith(
			'/setups/alice/my-setup',
			expect.objectContaining({
				name: 'my-setup',
				files: expect.arrayContaining([expect.objectContaining({ content: 'file content here' })])
			})
		);
		expect(ctx.api.post).not.toHaveBeenCalled();
	});

	it('displays updated message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('updated'));
		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});
});

// ── --json mode ───────────────────────────────────────────────────────────────

describe('--json mode', () => {
	it('calls setOutputMode("json") when --json is passed', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish', '--json']);

		expect(ctx.io.setOutputMode).toHaveBeenCalledWith('json');
	});

	it('outputs structured JSON on successful create', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish', '--json']);

		expect(ctx.io.json).toHaveBeenCalledWith({
			action: 'created',
			owner: 'alice',
			slug: 'my-setup',
			url: expect.stringContaining('alice/my-setup')
		});
	});

	it('outputs structured JSON on successful update', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		vi.mocked(ctx.api.get).mockResolvedValue(MOCK_SETUP_RESPONSE);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish', '--json']);

		expect(ctx.io.json).toHaveBeenCalledWith({
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
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toEqual(manifest);
		expect(ctx.io.error).not.toHaveBeenCalled();
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
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toEqual(manifest);
		expect(ctx.io.error).not.toHaveBeenCalled();
		expect(ctx.io.confirm).not.toHaveBeenCalled();
	});

	it('returns null and errors for unknown agent slug', async () => {
		const manifest = makeManifest({
			files: [{ source: '.foo', target: '.foo', placement: 'project', agent: 'totally-unknown' }]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toBeNull();
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('totally-unknown'));
	});

	it('returns null for multiple unknown agent slugs', async () => {
		const manifest = makeManifest({
			files: [
				{ source: '.foo', target: '.foo', placement: 'project', agent: 'bad-agent-1' },
				{ source: '.bar', target: '.bar', placement: 'project', agent: 'bad-agent-2' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toBeNull();
		expect(ctx.io.error).toHaveBeenCalledTimes(2);
	});

	it('warns and offers to add missing agent when not in agents array', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).not.toBeNull();
		expect(ctx.io.error).not.toHaveBeenCalled();
		expect(ctx.io.warning).toHaveBeenCalledWith(expect.stringContaining('cursor'));
		expect(ctx.io.confirm).toHaveBeenCalledWith(expect.stringContaining('cursor'), true);
	});

	it('adds agent to agents array when user confirms auto-fix', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).toContain('cursor');
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ agents: expect.arrayContaining(['cursor']) })
		);
	});

	it('does not update agents array when user declines auto-fix', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).not.toContain('cursor');
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('handles multiple missing agents with mixed confirm/decline', async () => {
		vi.mocked(ctx.io.confirm)
			.mockResolvedValueOnce(true) // accept claude-code
			.mockResolvedValueOnce(false); // decline cursor
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: 'CLAUDE.md', target: 'CLAUDE.md', placement: 'project', agent: 'claude-code' },
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).not.toBeNull();
		expect(result!.agents).toContain('claude-code');
		expect(result!.agents).not.toContain('cursor');
	});

	it('skips auto-fix prompts in JSON mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const manifest = makeManifest({
			agents: [],
			files: [
				{ source: '.cursorrules', target: '.cursorrules', placement: 'project', agent: 'cursor' }
			]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).not.toBeNull();
		expect(ctx.io.confirm).not.toHaveBeenCalled();
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

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('nonexistent-agent'));
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(ctx.api.post).not.toHaveBeenCalled();
	});

	it('offers auto-fix when file agent is missing from agents array, and publishes after accepting', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);
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
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.io.confirm).toHaveBeenCalledWith(expect.stringContaining('cursor'), true);
		expect(ctx.api.post).toHaveBeenCalled();
	});

	it('still publishes when user declines auto-fix for missing agent', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);
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
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalled();
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

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('.claude/commands/foo.md'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('errors and exits when manifest is invalid', async () => {
		mockReadManifest.mockImplementation(() => {
			throw new Error('Invalid coati.json:\n  name: Required');
		});
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Invalid coati.json'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows re-authentication hint on 401 error', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(new ApiError('Unauthorized', 'UNAUTHORIZED', 401));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('coati login'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows validation message on 422 error', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(
			new ApiError('Slug already taken', 'SLUG_TAKEN', 422)
		);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows error message on network failure', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(new Error('Network error: unable to reach server'));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows authentication failed message on expired/invalid token (401)', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(new ApiError('Unauthorized', 'UNAUTHORIZED', 401));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(
			'Authentication failed. Run `coati login` to re-authenticate.'
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows field-level validation errors on 400 response', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(
			new ApiError('name: Required, slug: Invalid format', 'VALIDATION_ERROR', 400)
		);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(
			expect.stringContaining('name: Required, slug: Invalid format')
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows duplicate slug message on 409 SLUG_TAKEN response', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(
			new ApiError('Slug already taken', 'SLUG_TAKEN', 409)
		);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(
			'A setup with this slug already exists. Choose a different name or slug.'
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows network error message when connection is refused (ECONNREFUSED)', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3000'));
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(
			'Could not reach the Coati API. Check your internet connection.'
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('shows server error message on 500 response', async () => {
		vi.mocked(ctx.api.post).mockRejectedValue(
			new ApiError('Internal Server Error', 'INTERNAL_ERROR', 500)
		);
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith('Server error. Please try again later.');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});
