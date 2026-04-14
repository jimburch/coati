import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printBanner } from './banner.js';

describe('printBanner', () => {
	let output: string;

	beforeEach(() => {
		output = '';
		vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			output += args.join(' ') + '\n';
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('prints logo and tagline without version when no version given', () => {
		printBanner();
		expect(output).toContain('██');
		expect(output).toContain('Share, discover, and clone AI coding setups');
		expect(output).not.toMatch(/v\d+\.\d+\.\d+/);
	});

	it('prints version below the tagline when version is provided', () => {
		printBanner('1.2.3');
		expect(output).toContain('██');
		expect(output).toContain('v1.2.3');
		// Version should appear after the tagline
		const taglineIdx = output.indexOf('Share, discover');
		const versionIdx = output.indexOf('v1.2.3');
		expect(versionIdx).toBeGreaterThan(taglineIdx);
	});
});
