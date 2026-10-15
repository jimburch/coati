import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgres://test:test@localhost/test' }
}));

const mockPostgres = vi.fn(() => ({ end: vi.fn() }));
vi.mock('postgres', () => ({ default: mockPostgres }));

const drizzleClients: Array<{ id: string; ping: () => string }> = [];
vi.mock('drizzle-orm/postgres-js', () => ({
	drizzle: vi.fn(() => {
		const client = {
			id: `db-${drizzleClients.length}`,
			ping() {
				return this.id;
			}
		};
		drizzleClients.push(client);
		return client;
	})
}));

describe('db/index', () => {
	it('does not open a connection at import time', async () => {
		await import('./index');
		expect(mockPostgres).not.toHaveBeenCalled();
	});

	it('createDb uses a small Hyperdrive-friendly pool and fetches array types', async () => {
		const { createDb } = await import('./index');
		createDb('postgres://hyperdrive/local');
		expect(mockPostgres).toHaveBeenCalledWith('postgres://hyperdrive/local', {
			max: 5,
			fetch_types: true,
			prepare: true
		});
	});

	it('keeps concurrent requests on different clients', async () => {
		const { createDb, runWithDatabase, db } = await import('./index');
		const a = createDb('postgres://a').db as unknown as { ping: () => string };
		const b = createDb('postgres://b').db as unknown as { ping: () => string };
		const proxy = db as unknown as { ping: () => string };

		const [seenA, seenB] = await Promise.all([
			runWithDatabase(a as never, async () => {
				await Promise.resolve();
				return proxy.ping();
			}),
			runWithDatabase(b as never, async () => {
				await Promise.resolve();
				return proxy.ping();
			})
		]);

		expect(seenA).toBe(a.ping());
		expect(seenB).toBe(b.ping());
		expect(seenA).not.toBe(seenB);
	});
});
