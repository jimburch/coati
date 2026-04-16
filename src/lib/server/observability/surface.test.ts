import { describe, it, expect } from 'vitest';
import { detectSurface } from './surface';

describe('detectSurface', () => {
	it('detects cli surface from valid @coati/cli user-agent', () => {
		const result = detectSurface('@coati/cli/0.3.2');
		expect(result.surface).toBe('cli');
		expect(result.cliVersion).toBe('0.3.2');
	});

	it('extracts cli version correctly', () => {
		const result = detectSurface('@coati/cli/1.12.3');
		expect(result.surface).toBe('cli');
		expect(result.cliVersion).toBe('1.12.3');
	});

	it('detects web surface from browser user-agent', () => {
		const result = detectSurface(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		);
		expect(result.surface).toBe('web');
		expect(result.cliVersion).toBeNull();
	});

	it('detects web surface when user-agent is null', () => {
		const result = detectSurface(null);
		expect(result.surface).toBe('web');
		expect(result.cliVersion).toBeNull();
	});

	it('detects web surface for malformed cli user-agent (non-numeric version)', () => {
		const result = detectSurface('@coati/cli/not-a-version');
		expect(result.surface).toBe('web');
		expect(result.cliVersion).toBeNull();
	});

	it('detects web surface for partial cli user-agent embedded in longer string', () => {
		const result = detectSurface('prefix @coati/cli/0.3.2 suffix');
		expect(result.surface).toBe('web');
		expect(result.cliVersion).toBeNull();
	});

	it('detects web surface for empty user-agent string', () => {
		const result = detectSurface('');
		expect(result.surface).toBe('web');
		expect(result.cliVersion).toBeNull();
	});
});
