import { describe, it, expect } from 'vitest';
import { BMC_URL, BMC_HANDLE, GITHUB_REPO_URL } from './support';

describe('support constants', () => {
	it('BMC_HANDLE is jimburch', () => {
		expect(BMC_HANDLE).toBe('jimburch');
	});

	it('BMC_URL points to buymeacoffee.com/jimburch with https', () => {
		expect(BMC_URL).toBe('https://buymeacoffee.com/jimburch');
	});

	it('BMC_URL contains BMC_HANDLE (consistency)', () => {
		expect(BMC_URL.endsWith(`/${BMC_HANDLE}`)).toBe(true);
	});

	it('GITHUB_REPO_URL is the coati repo on github.com with https', () => {
		expect(GITHUB_REPO_URL).toBe('https://github.com/jimburch/coati');
	});
});
