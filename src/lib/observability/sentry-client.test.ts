import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must be declared before mock factories
let mockPublicEnv = '';
let mockPublicSentryDsn = '';
let mockPublicAppVersion = '';

vi.mock('$env/dynamic/public', () => ({
	env: {
		get PUBLIC_ENV() {
			return mockPublicEnv;
		},
		get PUBLIC_SENTRY_DSN() {
			return mockPublicSentryDsn;
		},
		get PUBLIC_APP_VERSION() {
			return mockPublicAppVersion;
		}
	}
}));

const mockSentryInit = vi.fn();

vi.mock('@sentry/sveltekit', () => ({
	init: (...args: unknown[]) => mockSentryInit(...args)
}));

import { initSentryBrowser } from './sentry-client';

describe('initSentryBrowser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicSentryDsn = '';
		mockPublicAppVersion = '';
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('does not call Sentry.init when PUBLIC_ENV is not set (local)', () => {
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentryBrowser();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('does not call Sentry.init when PUBLIC_ENV is an unknown value', () => {
		mockPublicEnv = 'preview';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentryBrowser();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('calls Sentry.init when PUBLIC_ENV is staging', () => {
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledOnce();
	});

	it('calls Sentry.init when PUBLIC_ENV is production', () => {
		mockPublicEnv = 'production';
		mockPublicSentryDsn = 'https://fake@sentry.io/456';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledOnce();
	});

	it('does not call Sentry.init when DSN is absent', () => {
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = '';
		initSentryBrowser();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('passes sendDefaultPii: false in Sentry config', () => {
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
	});

	it('tags release as coati-web@<version> when PUBLIC_APP_VERSION is set', () => {
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		mockPublicAppVersion = '2.0.0';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ release: 'coati-web@2.0.0' })
		);
	});

	it('uses coati-web@unknown when PUBLIC_APP_VERSION is not set', () => {
		mockPublicEnv = 'production';
		mockPublicSentryDsn = 'https://fake@sentry.io/456';
		mockPublicAppVersion = '';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ release: 'coati-web@unknown' })
		);
	});

	it('passes environment label into Sentry config', () => {
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentryBrowser();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ environment: 'staging' })
		);
	});
});
