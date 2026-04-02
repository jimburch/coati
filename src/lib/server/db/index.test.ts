import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: 'postgres://test:test@localhost/test' }
}));

const mockPostgres = vi.fn(() => ({}));
vi.mock('postgres', () => ({ default: mockPostgres }));

vi.mock('drizzle-orm/postgres-js', () => ({
	drizzle: vi.fn(() => ({}))
}));

describe('db/index', () => {
	it('configures postgres with pool settings', async () => {
		await import('./index');
		expect(mockPostgres).toHaveBeenCalledWith('postgres://test:test@localhost/test', {
			max: 20,
			idle_timeout: 30,
			connect_timeout: 10
		});
	});
});
