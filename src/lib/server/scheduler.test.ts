import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

const capturedSql = vi.hoisted(() => ({ queries: [] as string[] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	sqlFn.join = vi.fn();
	return { sql: sqlFn };
});

vi.mock('$lib/server/db', () => ({
	db: { execute: mockExecute }
}));

import { refreshTrendingView, startScheduler } from './scheduler';

describe('refreshTrendingView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
	});

	it('executes REFRESH MATERIALIZED VIEW CONCURRENTLY trending_setups_mv', async () => {
		mockExecute.mockResolvedValueOnce([]);

		await refreshTrendingView();

		expect(mockExecute).toHaveBeenCalledOnce();
		const hasConcurrentRefresh = capturedSql.queries.some(
			(q) =>
				q.includes('REFRESH MATERIALIZED VIEW CONCURRENTLY') && q.includes('trending_setups_mv')
		);
		expect(hasConcurrentRefresh).toBe(true);
	});

	it('calls db.execute exactly once per refresh', async () => {
		mockExecute.mockResolvedValueOnce([]);

		await refreshTrendingView();

		expect(mockExecute).toHaveBeenCalledTimes(1);
	});
});

describe('startScheduler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('refreshes the trending view every 15 minutes', async () => {
		mockExecute.mockResolvedValue([]);

		startScheduler();

		// Advance time by 15 minutes
		await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
		expect(mockExecute).toHaveBeenCalledTimes(1);

		// Advance another 15 minutes
		await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
		expect(mockExecute).toHaveBeenCalledTimes(2);
	});

	it('does not refresh immediately on start', () => {
		mockExecute.mockResolvedValue([]);

		startScheduler();

		expect(mockExecute).not.toHaveBeenCalled();
	});
});
