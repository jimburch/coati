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

const MOCK_MANIFEST: Manifest = {
	name: 'my-setup',
	version: '1.0.0',
	description: 'A test setup',
	files: [
		{
			path: '.claude/commands/foo.md',
			componentType: 'command'
		}
	]
};

const MOCK_MANIFEST_WITH_ID: Manifest = {
	...MOCK_MANIFEST,
	id: 'setup-uuid-123'
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

// ── Branch 1: no id in manifest → POST → write id back ───────────────────────

describe('create new setup (no id in manifest)', () => {
	it('calls POST /setups when manifest has no id', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalledWith(
			'/setups',
			expect.objectContaining({
				name: 'my-setup',
				slug: 'my-setup',
				description: 'A test setup',
				files: expect.arrayContaining([
					expect.objectContaining({
						path: '.claude/commands/foo.md',
						componentType: 'command',
						content: 'file content here'
					})
				])
			})
		);
		expect(ctx.api.patch).not.toHaveBeenCalled();
	});

	it('does not include version in POST payload', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).not.toHaveProperty('version');
	});

	it('does not include placement in POST payload', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, placement: 'global' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).not.toHaveProperty('placement');
	});

	it('writes the returned id back into coati.json', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ id: 'setup-123' })
		);
	});

	it('places id after $schema and before name in written manifest', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, $schema: 'https://example.com/schema' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const [, writtenManifest] = mockWriteManifest.mock.calls[0] as [
			string,
			Record<string, unknown>
		];
		const keys = Object.keys(writtenManifest);
		expect(keys.indexOf('$schema')).toBeLessThan(keys.indexOf('id'));
		expect(keys.indexOf('id')).toBeLessThan(keys.indexOf('name'));
	});

	it('places id before name when no $schema field', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const [, writtenManifest] = mockWriteManifest.mock.calls[0] as [
			string,
			Record<string, unknown>
		];
		const keys = Object.keys(writtenManifest);
		expect(keys.indexOf('id')).toBeLessThan(keys.indexOf('name'));
	});

	it('displays published success message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('published'));
		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});
});

// ── Branch 2: has id, owns it → PATCH /setups/{id} ────────────────────────────

describe('update existing setup (has id in manifest)', () => {
	beforeEach(() => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
	});

	it('calls PATCH /setups/{id} when manifest has id', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.patch).toHaveBeenCalledWith(
			'/setups/setup-uuid-123',
			expect.objectContaining({
				name: 'my-setup',
				files: expect.arrayContaining([expect.objectContaining({ content: 'file content here' })])
			})
		);
		expect(ctx.api.post).not.toHaveBeenCalled();
	});

	it('does not include id or version in PATCH payload', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).not.toHaveProperty('id');
		expect(patchCall).not.toHaveProperty('version');
	});

	it('does not include placement in PATCH payload', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST_WITH_ID, placement: 'global' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).not.toHaveProperty('placement');
	});

	it('displays updated success message with setup URL', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('updated'));
		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining('alice/my-setup'));
	});

	it('does not write id back to coati.json on update', async () => {
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(mockWriteManifest).not.toHaveBeenCalled();
	});
});

// ── Branch 3: has id, server returns 404 ─────────────────────────────────────

describe('update with id — 404 response', () => {
	beforeEach(() => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
		vi.mocked(ctx.api.patch).mockRejectedValue(new ApiError('Not Found', 'NOT_FOUND', 404));
	});

	it('shows error telling user to remove id from coati.json', async () => {
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(
			'Setup with this ID no longer exists. Remove `id` from coati.json to publish as new.'
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});

// ── Branch 4: has id, server returns 403 ─────────────────────────────────────

describe('update with id — 403 response', () => {
	beforeEach(() => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
		vi.mocked(ctx.api.patch).mockRejectedValue(new ApiError('Forbidden', 'FORBIDDEN', 403));
	});

	it('shows ownership error message', async () => {
		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(program.parseAsync(['node', 'coati', 'publish'])).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith("You don't own the setup with this ID.");
		expect(exitSpy).toHaveBeenCalledWith(1);
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
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
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
			files: [{ path: 'README.md' }]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toEqual(manifest);
		expect(ctx.io.error).not.toHaveBeenCalled();
	});

	it('returns manifest unchanged when all file agents are in agents array', async () => {
		const manifest = makeManifest({
			agents: ['claude-code'],
			files: [{ path: 'CLAUDE.md', agent: 'claude-code' }]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toEqual(manifest);
		expect(ctx.io.error).not.toHaveBeenCalled();
		expect(ctx.io.confirm).not.toHaveBeenCalled();
	});

	it('returns null and errors for unknown agent slug', async () => {
		const manifest = makeManifest({
			files: [{ path: '.foo', agent: 'totally-unknown' }]
		});
		const result = await validateAgentRefs(ctx, manifest, CWD);
		expect(result).toBeNull();
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('totally-unknown'));
	});

	it('returns null for multiple unknown agent slugs', async () => {
		const manifest = makeManifest({
			files: [
				{ path: '.foo', agent: 'bad-agent-1' },
				{ path: '.bar', agent: 'bad-agent-2' }
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
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
				{ path: 'CLAUDE.md', agent: 'claude-code' },
				{ path: '.cursorrules', agent: 'cursor' }
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
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
					path: '.claude/commands/foo.md',
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
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
			files: [{ path: '.cursorrules', agent: 'cursor' }]
		});
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalled();
	});
});

// ── version field handling ────────────────────────────────────────────────────

describe('publish — version field in coati.json', () => {
	it('does not include version in publish payload even when present in coati.json', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, version: '1.0.0' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).not.toHaveProperty('version');
		expect(ctx.io.error).not.toHaveBeenCalled();
	});
});

// ── placement field (ignored) ─────────────────────────────────────────────────

describe('publish — placement field in coati.json', () => {
	it('accepts manifest with placement field and publishes without errors', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, placement: 'global' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalled();
		expect(ctx.io.error).not.toHaveBeenCalled();
	});
});

// ── display field ─────────────────────────────────────────────────────────────

describe('publish — display field in coati.json', () => {
	it('includes display in POST payload when present in manifest', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, display: 'My Awesome Setup' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).toHaveProperty('display', 'My Awesome Setup');
	});

	it('omits display from POST payload when absent in manifest (backward compat)', async () => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).not.toHaveProperty('display');
	});

	it('includes display in PATCH payload when present in manifest', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST_WITH_ID, display: 'My Awesome Setup' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).toHaveProperty('display', 'My Awesome Setup');
	});

	it('omits display from PATCH payload when absent in manifest', async () => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).not.toHaveProperty('display');
	});
});

// ── clone-tracking fields ─────────────────────────────────────────────────────

describe('publish — clone-tracking fields', () => {
	it('accepts manifest with tracking fields and publishes without errors', async () => {
		mockReadManifest.mockReturnValue({
			...MOCK_MANIFEST,
			source: 'bob/original-setup',
			clonedAt: '2026-03-30T12:00:00.000Z',
			revision: '1.0.0'
		});
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		expect(ctx.api.post).toHaveBeenCalled();
		expect(ctx.io.error).not.toHaveBeenCalled();
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

// ── visibility in publish payload ─────────────────────────────────────────────

describe('visibility in publish payload', () => {
	it('includes visibility: private in POST payload when manifest has private visibility', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, visibility: 'private' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).toHaveProperty('visibility', 'private');
	});

	it('includes visibility: public in POST payload when manifest has public visibility', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST, visibility: 'public' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).toHaveProperty('visibility', 'public');
	});

	it('omits visibility from POST payload when manifest has no visibility field', async () => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const postCall = vi.mocked(ctx.api.post).mock.calls[0][1] as Record<string, unknown>;
		expect(postCall).not.toHaveProperty('visibility');
	});

	it('includes visibility: private in PATCH payload when updating with private visibility', async () => {
		mockReadManifest.mockReturnValue({ ...MOCK_MANIFEST_WITH_ID, visibility: 'private' });
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).toHaveProperty('visibility', 'private');
	});

	it('omits visibility from PATCH payload when manifest has no visibility field', async () => {
		mockReadManifest.mockReturnValue(MOCK_MANIFEST_WITH_ID);
		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'publish']);

		const patchCall = vi.mocked(ctx.api.patch).mock.calls[0][1] as Record<string, unknown>;
		expect(patchCall).not.toHaveProperty('visibility');
	});
});
