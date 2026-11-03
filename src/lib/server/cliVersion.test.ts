import { describe, it, expect } from 'vitest';
import { isSupportedCliVersion, MIN_CLI_VERSION, requireCliVersion } from './cliVersion';

describe('isSupportedCliVersion', () => {
	it.each([
		[MIN_CLI_VERSION, true],
		['1.0.1', true],
		['1.2.0', true],
		['2.0.0', true],
		['v1.0.0', true],
		['1.0.0-beta.1', true],
		['0.8.0', false],
		['0.99.99', false],
		['1.0', false],
		['latest', false],
		['', false],
		[null, false]
	])('%s → %s', (version, expected) => {
		expect(isSupportedCliVersion(version)).toBe(expected);
	});
});

describe('requireCliVersion', () => {
	const req = (v?: string) =>
		new Request('http://x', { headers: v === undefined ? {} : { 'X-Coati-CLI': v } });

	it('passes a current CLI through', () => {
		expect(requireCliVersion(req('1.0.0'))).toBeNull();
	});

	it('answers 426 CLI_OUTDATED for a missing or old header', async () => {
		for (const r of [req(), req('0.8.0')]) {
			const res = requireCliVersion(r)!;
			expect(res.status).toBe(426);
			expect(await res.json()).toEqual({
				error: 'This version of coati is no longer supported. Run npm i -g @coati/sh@latest',
				code: 'CLI_OUTDATED'
			});
		}
	});
});
