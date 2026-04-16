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
const mockSetUser = vi.fn();
const mockAddBreadcrumb = vi.fn();
const mockWithScope = vi.fn();

vi.mock('@sentry/sveltekit', () => ({
	init: (...args: unknown[]) => mockSentryInit(...args),
	setUser: (...args: unknown[]) => mockSetUser(...args),
	addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
	withScope: (...args: unknown[]) => mockWithScope(...args)
}));

import { initSentry, setSentryUser, addSentryBreadcrumb } from './sentry';

describe('initSentry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicSentryDsn = '';
		mockPublicAppVersion = '';
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('does not call Sentry.init when environment is local (no PUBLIC_ENV set)', () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentry();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('does not call Sentry.init when environment is test', () => {
		// vitest sets NODE_ENV=test by default
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentry();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('calls Sentry.init when environment is staging', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledOnce();
	});

	it('calls Sentry.init when environment is production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'production';
		mockPublicSentryDsn = 'https://fake@sentry.io/456';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledOnce();
	});

	it('does not call Sentry.init when DSN is absent', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = '';
		initSentry();
		expect(mockSentryInit).not.toHaveBeenCalled();
	});

	it('passes sendDefaultPii: false in Sentry config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
	});

	it('tags release as coati-web@<version> when PUBLIC_APP_VERSION is set', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		mockPublicAppVersion = '1.2.3';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ release: 'coati-web@1.2.3' })
		);
	});

	it('uses coati-web@unknown when PUBLIC_APP_VERSION is not set', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'production';
		mockPublicSentryDsn = 'https://fake@sentry.io/456';
		mockPublicAppVersion = '';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ release: 'coati-web@unknown' })
		);
	});

	it('passes environment label into Sentry config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicSentryDsn = 'https://fake@sentry.io/123';
		initSentry();
		expect(mockSentryInit).toHaveBeenCalledWith(
			expect.objectContaining({ environment: 'staging' })
		);
	});
});

describe('setSentryUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls Sentry.setUser with id and username', () => {
		setSentryUser({ id: 'u1', username: 'alice' });
		expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', username: 'alice' });
	});
});

describe('addSentryBreadcrumb', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls Sentry.addBreadcrumb with message', () => {
		addSentryBreadcrumb('user logged in');
		expect(mockAddBreadcrumb).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'user logged in' })
		);
	});

	it('calls Sentry.addBreadcrumb with message, category, and data', () => {
		addSentryBreadcrumb('setup viewed', 'navigation', { setupId: 'abc' });
		expect(mockAddBreadcrumb).toHaveBeenCalledWith({
			message: 'setup viewed',
			category: 'navigation',
			data: { setupId: 'abc' }
		});
	});
});
