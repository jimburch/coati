import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { refreshTrendingView } from './scheduler';

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
