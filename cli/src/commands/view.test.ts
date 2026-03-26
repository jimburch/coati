import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createTestContext } from '../test-utils.js';
import { ApiError } from '../context.js';
import { registerView } from './view.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(overrides?: Parameters<typeof createTestContext>[0]) {
	const ctx = createTestContext(overrides);
	const program = new Command();
	program.exitOverride();
	registerView(program, ctx);
	return { program, ctx };
}

function exitSpy() {
	return vi.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});
}

function makeSetup(
	overrides: Partial<{
		id: string;
		name: string;
		slug: string;
		description: string;
		ownerUsername: string;
		starsCount: number;
		clonesCount: number;
		postInstall: string | null;
		agents: string[];
		tags: string[];
	}> = {}
) {
	return {
		id: '1',
		name: 'My Setup',
		slug: 'my-setup',
		description: 'A test setup',
		ownerUsername: 'alice',
		starsCount: 5,
		clonesCount: 10,
		postInstall: null,
		agents: [],
		tags: [],
		...overrides
	};
}

function makeFile(
	overrides: Partial<{
		id: string;
		source: string;
		target: string;
		placement: string;
		componentType: string;
		agent: string;
	}> = {}
) {
	return {
		id: 'f1',
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project',
		...overrides
	};
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('coati view', () => {
	it('fetches setup and files by owner/slug', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValueOnce(makeSetup()).mockResolvedValueOnce([]);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
	});

	it('displays setup name and description', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get)
			.mockResolvedValueOnce(makeSetup({ name: 'My Setup', description: 'Helpful setup' }))
			.mockResolvedValueOnce([]);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/My Setup/);
		expect(allPrints).toMatch(/Helpful setup/);
	});

	it('displays agents with per-agent file counts', async () => {
		const { program, ctx } = makeProgram();
		const setup = makeSetup({ agents: ['claude-code', 'cursor'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: '.cursorrules', agent: 'cursor' }),
			makeFile({ id: 'f3', source: '.cursorrules2', agent: 'cursor' })
		];
		vi.mocked(ctx.api.get).mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/Claude Code: 1 file/);
		expect(allPrints).toMatch(/Cursor: 2 files/);
	});

	it('includes shared file count when files have no agent', async () => {
		const { program, ctx } = makeProgram();
		const setup = makeSetup({ agents: ['claude-code'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: 'README.md' }) // no agent = shared
		];
		vi.mocked(ctx.api.get).mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/Shared: 1 file/);
	});

	it('omits agents section when setup has no agents', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get)
			.mockResolvedValueOnce(makeSetup({ agents: [] }))
			.mockResolvedValueOnce([makeFile()]);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).not.toMatch(/Agents:/);
	});

	it('shows file list with agent labels', async () => {
		const { program, ctx } = makeProgram();
		const setup = makeSetup({ agents: ['claude-code'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: 'README.md' })
		];
		vi.mocked(ctx.api.get).mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await program.parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/CLAUDE\.md.*Claude Code/);
		expect(allPrints).toMatch(/README\.md/);
	});

	it('outputs JSON when --json flag is set', async () => {
		const { program, ctx } = makeProgram({
			io: { isJson: vi.fn(() => true) }
		});
		const setup = makeSetup();
		const files = [makeFile()];
		vi.mocked(ctx.api.get).mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await program.parseAsync(['view', '--json', 'alice/my-setup'], { from: 'user' });
		expect(ctx.io.setOutputMode).toHaveBeenCalledWith('json');
		expect(ctx.io.json).toHaveBeenCalledWith({ setup, files });
	});

	it('shows 404 error for unknown setup', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockRejectedValueOnce(new ApiError('Not found', 'NOT_FOUND', 404));
		const spy = exitSpy();
		await expect(
			program.parseAsync(['view', 'alice/nonexistent'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('shows error for invalid format (no slash)', async () => {
		const { program, ctx } = makeProgram();
		const spy = exitSpy();
		await expect(program.parseAsync(['view', 'invalidformat'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});
