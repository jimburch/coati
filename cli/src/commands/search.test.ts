import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createTestContext } from '../test-utils.js';
import { ApiError } from '../context.js';
import { registerSearch } from './search.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(overrides?: Parameters<typeof createTestContext>[0]) {
	const ctx = createTestContext(overrides);
	const program = new Command();
	program.exitOverride();
	registerSearch(program, ctx);
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
		agents: string[];
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
		agents: [],
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

describe('coati search', () => {
	it('calls GET /setups with no params when no query or agent', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([]);
		await program.parseAsync(['search'], { from: 'user' });
		expect(ctx.api.get).toHaveBeenCalledWith('/setups');
	});

	it('passes query string as ?q= param', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([]);
		await program.parseAsync(['search', 'typescript'], { from: 'user' });
		expect(ctx.api.get).toHaveBeenCalledWith('/setups?q=typescript');
	});

	it('passes --agent flag as ?agent= param', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([]);
		await program.parseAsync(['search', '--agent', 'claude-code'], { from: 'user' });
		expect(ctx.api.get).toHaveBeenCalledWith('/setups?agent=claude-code');
	});

	it('passes both query and --agent params', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([]);
		await program.parseAsync(['search', 'typescript', '--agent', 'cursor'], { from: 'user' });
		expect(ctx.api.get).toHaveBeenCalledWith('/setups?q=typescript&agent=cursor');
	});

	it('displays no results message when empty', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([]);
		await program.parseAsync(['search'], { from: 'user' });
		expect(ctx.io.info).toHaveBeenCalledWith('No setups found.');
	});

	it('displays setup owner/slug, description, and stats', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([makeSetup()]);
		await program.parseAsync(['search'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/alice\/my-setup/);
		expect(allPrints).toMatch(/A test setup/);
	});

	it('displays agent names for each setup result', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([makeSetup({ agents: ['claude-code', 'cursor'] })]);
		await program.parseAsync(['search'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).toMatch(/Claude Code/);
		expect(allPrints).toMatch(/Cursor/);
	});

	it('omits agents line when setup has no agents', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockResolvedValue([makeSetup({ agents: [] })]);
		await program.parseAsync(['search'], { from: 'user' });
		const allPrints = vi
			.mocked(ctx.io.print)
			.mock.calls.map((c) => c[0])
			.join('\n');
		expect(allPrints).not.toMatch(/Agents:/);
	});

	it('outputs JSON when --json flag is set', async () => {
		const { program, ctx } = makeProgram({
			io: { isJson: vi.fn(() => true) }
		});
		const results = [makeSetup()];
		vi.mocked(ctx.api.get).mockResolvedValue(results);
		await program.parseAsync(['search', '--json'], { from: 'user' });
		expect(ctx.io.setOutputMode).toHaveBeenCalledWith('json');
		expect(ctx.io.json).toHaveBeenCalledWith(results);
	});

	it('shows error and exits on API failure', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockRejectedValue(new Error('Network error'));
		const spy = exitSpy();
		await expect(program.parseAsync(['search'], { from: 'user' })).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('shows error message on ApiError', async () => {
		const { program, ctx } = makeProgram();
		vi.mocked(ctx.api.get).mockRejectedValue(new ApiError('Not found', 'NOT_FOUND', 404));
		const spy = exitSpy();
		await expect(program.parseAsync(['search'], { from: 'user' })).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Not found'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});
