import { describe, it, expect, vi, afterEach } from 'vitest';

// Must be declared before the mock factory and before importing the module under test
let mockPublicEnv = '';

vi.mock('$env/dynamic/public', () => ({
	env: {
		get PUBLIC_ENV() {
			return mockPublicEnv;
		}
	}
}));

import { getEnvironment } from './env';

describe('getEnvironment', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		mockPublicEnv = '';
	});

	it('returns "test" when NODE_ENV is "test"', () => {
		// vitest sets NODE_ENV to 'test' by default
		expect(getEnvironment()).toBe('test');
	});

	it('returns "staging" when PUBLIC_ENV is "staging" and NODE_ENV is not "test"', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		expect(getEnvironment()).toBe('staging');
	});

	it('returns "production" when PUBLIC_ENV is "production" and NODE_ENV is not "test"', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'production';
		expect(getEnvironment()).toBe('production');
	});

	it('returns "local" when neither NODE_ENV is "test" nor PUBLIC_ENV is set', () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockPublicEnv = '';
		expect(getEnvironment()).toBe('local');
	});

	it('returns "local" when NODE_ENV is not "test" and PUBLIC_ENV is an unknown value', () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockPublicEnv = 'preview';
		expect(getEnvironment()).toBe('local');
	});

	it('NODE_ENV=test takes precedence over PUBLIC_ENV=staging', () => {
		// NODE_ENV is 'test' in vitest — PUBLIC_ENV should be ignored
		mockPublicEnv = 'staging';
		expect(getEnvironment()).toBe('test');
	});

	it('NODE_ENV=test takes precedence over PUBLIC_ENV=production', () => {
		// NODE_ENV is 'test' in vitest — PUBLIC_ENV should be ignored
		mockPublicEnv = 'production';
		expect(getEnvironment()).toBe('test');
	});
});
