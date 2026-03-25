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
const { registerSearch } = await import('./search.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride();
	registerSearch(program);
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
	mockIsJsonMode.mockReturnValue(false);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('magpie search', () => {
	it('calls GET /setups with no params when no query or agent', async () => {
		mockGet.mockResolvedValue([]);
		await makeProgram().parseAsync(['search'], { from: 'user' });
		expect(mockGet).toHaveBeenCalledWith('/setups');
	});

	it('passes query string as ?q= param', async () => {
		mockGet.mockResolvedValue([]);
		await makeProgram().parseAsync(['search', 'typescript'], { from: 'user' });
		expect(mockGet).toHaveBeenCalledWith('/setups?q=typescript');
	});

	it('passes --agent flag as ?agent= param', async () => {
		mockGet.mockResolvedValue([]);
		await makeProgram().parseAsync(['search', '--agent', 'claude-code'], { from: 'user' });
		expect(mockGet).toHaveBeenCalledWith('/setups?agent=claude-code');
	});

	it('passes both query and --agent params', async () => {
		mockGet.mockResolvedValue([]);
		await makeProgram().parseAsync(['search', 'typescript', '--agent', 'cursor'], {
			from: 'user'
		});
		expect(mockGet).toHaveBeenCalledWith('/setups?q=typescript&agent=cursor');
	});

	it('displays no results message when empty', async () => {
		mockGet.mockResolvedValue([]);
		await makeProgram().parseAsync(['search'], { from: 'user' });
		expect(mockInfo).toHaveBeenCalledWith('No setups found.');
	});

	it('displays setup owner/slug, description, and stats', async () => {
		mockGet.mockResolvedValue([makeSetup()]);
		await makeProgram().parseAsync(['search'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/alice\/my-setup/);
		expect(allPrints).toMatch(/A test setup/);
	});

	it('displays agent names for each setup result', async () => {
		mockGet.mockResolvedValue([makeSetup({ agents: ['claude-code', 'cursor'] })]);
		await makeProgram().parseAsync(['search'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).toMatch(/Claude Code/);
		expect(allPrints).toMatch(/Cursor/);
	});

	it('omits agents line when setup has no agents', async () => {
		mockGet.mockResolvedValue([makeSetup({ agents: [] })]);
		await makeProgram().parseAsync(['search'], { from: 'user' });
		const allPrints = mockPrint.mock.calls.map((c: unknown[]) => c[0]).join('\n');
		expect(allPrints).not.toMatch(/Agents:/);
	});

	it('outputs JSON when --json flag is set', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const results = [makeSetup()];
		mockGet.mockResolvedValue(results);
		await makeProgram().parseAsync(['search', '--json'], { from: 'user' });
		expect(mockSetOutputMode).toHaveBeenCalledWith('json');
		expect(mockJson).toHaveBeenCalledWith(results);
	});

	it('shows error and exits on API failure', async () => {
		mockGet.mockRejectedValue(new Error('Network error'));
		const spy = exitSpy();
		await expect(makeProgram().parseAsync(['search'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Network error'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});
