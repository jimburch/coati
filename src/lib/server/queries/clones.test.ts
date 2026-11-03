import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';
import { anonCloneKey } from './clones';

describe('anonCloneKey', () => {
	it('is sha256hex(HMAC(secret, utcDate) + ip), matching node:crypto', async () => {
		const day = new Date('2026-11-03T23:59:59Z');
		const salt = createHmac('sha256', 's3cret').update('2026-11-03').digest('hex');
		const expected = createHash('sha256')
			.update(salt + '203.0.113.7')
			.digest('hex');
		expect(await anonCloneKey('s3cret', '203.0.113.7', day)).toBe(expected);
	});

	it('is stable within a UTC day and changes the next day', async () => {
		const a = await anonCloneKey('s', 'ip', new Date('2026-11-03T00:00:01Z'));
		const b = await anonCloneKey('s', 'ip', new Date('2026-11-03T23:59:59Z'));
		const c = await anonCloneKey('s', 'ip', new Date('2026-11-04T00:00:00Z'));
		expect(a).toBe(b);
		expect(c).not.toBe(a);
	});

	it('differs by IP and by secret', async () => {
		const day = new Date('2026-11-03T12:00:00Z');
		const base = await anonCloneKey('s', '1.1.1.1', day);
		expect(await anonCloneKey('s', '1.1.1.2', day)).not.toBe(base);
		expect(await anonCloneKey('t', '1.1.1.1', day)).not.toBe(base);
	});
});
