import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('GET /api/v1/health', () => {
	it('returns status 200', async () => {
		const res = await GET({} as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
	});

	it('returns { data: { status: "ok", timestamp: string } }', async () => {
		const res = await GET({} as Parameters<typeof GET>[0]);
		const body = await res.json();
		expect(body).toHaveProperty('data');
		expect(body.data).toHaveProperty('status', 'ok');
		expect(body.data).toHaveProperty('timestamp');
	});

	it('returns a valid ISO 8601 timestamp', async () => {
		const res = await GET({} as Parameters<typeof GET>[0]);
		const body = await res.json();
		const date = new Date(body.data.timestamp);
		expect(date.toISOString()).toBe(body.data.timestamp);
	});

	it('returns Content-Type application/json', async () => {
		const res = await GET({} as Parameters<typeof GET>[0]);
		expect(res.headers.get('Content-Type')).toBe('application/json');
	});
});
