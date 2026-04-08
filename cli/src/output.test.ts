import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOutputClient, type OutputClient } from './output.js';

let io: OutputClient;

beforeEach(() => {
	io = createOutputClient();
	vi.restoreAllMocks();
});

describe('mode helpers', () => {
	it('defaults to text mode', () => {
		expect(io.isJsonMode()).toBe(false);
	});

	it('switches to json mode', () => {
		io.setOutputMode('json');
		expect(io.isJsonMode()).toBe(true);
	});

	it('tracks verbose flag', () => {
		expect(io.isVerbose()).toBe(false);
		io.setVerbose(true);
		expect(io.isVerbose()).toBe(true);
	});
});

describe('json()', () => {
	it('writes JSON to stdout', () => {
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.json({ foo: 'bar' });
		expect(spy).toHaveBeenCalledWith('{"foo":"bar"}\n');
	});
});

describe('print()', () => {
	it('writes text to stdout in text mode', () => {
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.print('hello');
		expect(spy).toHaveBeenCalledWith('hello\n');
	});

	it('is a no-op in json mode', () => {
		io.setOutputMode('json');
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.print('hello');
		expect(spy).not.toHaveBeenCalled();
	});
});

describe('success()', () => {
	it('writes to stdout', () => {
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.success('done');
		expect(spy).toHaveBeenCalledOnce();
		const out = spy.mock.calls[0]![0] as string;
		expect(out).toContain('done');
	});
});

describe('error()', () => {
	it('writes to stderr in text mode', () => {
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		io.error('oops');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0]![0] as string).toContain('oops');
	});

	it('writes JSON to stderr in json mode', () => {
		io.setOutputMode('json');
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		io.error('oops');
		expect(spy).toHaveBeenCalledOnce();
		const parsed = JSON.parse((spy.mock.calls[0]![0] as string).trim());
		expect(parsed).toEqual({ error: 'oops' });
	});
});

describe('warning() and info()', () => {
	it('write to stdout', () => {
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.warning('careful');
		io.info('note');
		expect(spy).toHaveBeenCalledTimes(2);
	});
});

describe('apiError()', () => {
	it('shows clean one-liner by default', () => {
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		io.apiError({
			message: 'Not found',
			code: 'NOT_FOUND',
			url: 'https://example.com',
			status: 404
		});
		expect(spy).toHaveBeenCalledOnce();
		const out = spy.mock.calls[0]![0] as string;
		expect(out).toContain('Not found');
		expect(out).not.toContain('404');
		expect(out).not.toContain('NOT_FOUND');
	});

	it('shows full details with verbose', () => {
		io.setVerbose(true);
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		io.apiError({
			message: 'Not found',
			code: 'NOT_FOUND',
			url: 'https://example.com',
			status: 404
		});
		expect(spy).toHaveBeenCalledOnce();
		const out = spy.mock.calls[0]![0] as string;
		expect(out).toContain('Not found');
		expect(out).toContain('404');
		expect(out).toContain('NOT_FOUND');
		expect(out).toContain('https://example.com');
	});

	it('emits JSON error in json mode', () => {
		io.setOutputMode('json');
		const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		io.apiError({ message: 'Not found' });
		const parsed = JSON.parse((spy.mock.calls[0]![0] as string).trim());
		expect(parsed.error).toBe('Not found');
	});
});

describe('table()', () => {
	it('renders aligned columns', () => {
		const rows = [
			{ name: 'alpha', stars: 10, description: 'First setup' },
			{ name: 'beta-longer', stars: 5, description: 'Second' }
		];
		const columns = [
			{ header: 'Name', key: 'name' },
			{ header: 'Stars', key: 'stars' },
			{ header: 'Description', key: 'description' }
		];
		const lines: string[] = [];
		vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			lines.push(chunk as string);
			return true;
		});
		io.table(rows, columns);
		// Header + separator + 2 rows = 4 writes
		expect(lines.length).toBe(4);
		// 'beta-longer' is 11 chars; name column should be at least that wide
		expect(lines[2]).toContain('alpha      ');
	});

	it('prints "No results." for empty rows', () => {
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		io.table([], [{ header: 'Name', key: 'name' }]);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0]![0] as string).toContain('No results.');
	});

	it('emits JSON in json mode', () => {
		io.setOutputMode('json');
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		const rows = [{ name: 'alpha' }];
		io.table(rows, [{ header: 'Name', key: 'name' }]);
		const parsed = JSON.parse((spy.mock.calls[0]![0] as string).trim());
		expect(parsed).toEqual(rows);
	});
});
