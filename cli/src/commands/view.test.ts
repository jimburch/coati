import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

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

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();

vi.mock('../api.js', () => ({
	get: (...args: unknown[]) => mockGet(...args),
	ApiError: MockApiError
}));

const mockSetOutputMode = vi.fn();
const mockIsJsonMode = vi.fn(() => false);
const mockJson = vi.fn();
const mockPrint = vi.fn();
const mockError = vi.fn();
const mockInfo = vi.fn();

vi.mock('../output.js', () => ({
	setOutputMode: (mode: string) => mockSetOutputMode(mode),
	isJsonMode: () => mockIsJsonMode(),
	json: (data: unknown) => mockJson(data),
	print: (msg: string) => mockPrint(msg),
	error: (msg: string) => mockError(msg),
	info: (msg: string) => mockInfo(msg)
}));

// Import after mocks are registered
const { registerView } = await import('./view.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride();
	registerView(program);
	return program;
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
	mockIsJsonMode.mockReturnValue(false);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('magpie view', () => {
	it('fetches setup and files by owner/slug', async () => {
		mockGet.mockResolvedValueOnce(makeSetup()).mockResolvedValueOnce([]);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		expect(mockGet).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(mockGet).toHaveBeenCalledWith('/setups/alice/my-setup/files');
	});

	it('displays setup name and description', async () => {
		mockGet
			.mockResolvedValueOnce(makeSetup({ name: 'My Setup', description: 'Helpful setup' }))
			.mockResolvedValueOnce([]);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/My Setup/);
		expect(allPrints).toMatch(/Helpful setup/);
	});

	it('displays agents with per-agent file counts', async () => {
		const setup = makeSetup({ agents: ['claude-code', 'cursor'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: '.cursorrules', agent: 'cursor' }),
			makeFile({ id: 'f3', source: '.cursorrules2', agent: 'cursor' })
		];
		mockGet.mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/Claude Code: 1 file/);
		expect(allPrints).toMatch(/Cursor: 2 files/);
	});

	it('includes shared file count when files have no agent', async () => {
		const setup = makeSetup({ agents: ['claude-code'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: 'README.md' }) // no agent = shared
		];
		mockGet.mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/Shared: 1 file/);
	});

	it('omits agents section when setup has no agents', async () => {
		mockGet.mockResolvedValueOnce(makeSetup({ agents: [] })).mockResolvedValueOnce([makeFile()]);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).not.toMatch(/Agents:/);
	});

	it('shows file list with agent labels', async () => {
		const setup = makeSetup({ agents: ['claude-code'] });
		const files = [
			makeFile({ source: 'CLAUDE.md', agent: 'claude-code' }),
			makeFile({ id: 'f2', source: 'README.md' })
		];
		mockGet.mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await makeProgram().parseAsync(['view', 'alice/my-setup'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/CLAUDE\.md.*Claude Code/);
		expect(allPrints).toMatch(/README\.md/);
	});

	it('outputs JSON when --json flag is set', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const setup = makeSetup();
		const files = [makeFile()];
		mockGet.mockResolvedValueOnce(setup).mockResolvedValueOnce(files);
		await makeProgram().parseAsync(['view', '--json', 'alice/my-setup'], { from: 'user' });
		expect(mockSetOutputMode).toHaveBeenCalledWith('json');
		expect(mockJson).toHaveBeenCalledWith({ setup, files });
	});

	it('shows 404 error for unknown setup', async () => {
		mockGet.mockRejectedValueOnce(new MockApiError('Not found', 'NOT_FOUND', 404));
		const spy = exitSpy();
		await expect(
			makeProgram().parseAsync(['view', 'alice/nonexistent'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('shows error for invalid format (no slash)', async () => {
		const spy = exitSpy();
		await expect(
			makeProgram().parseAsync(['view', 'invalidformat'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});
