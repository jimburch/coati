import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must be declared before mock factories
let mockPublicEnv = '';
let mockPublicMixpanelToken = '';

vi.mock('$env/dynamic/public', () => ({
	env: {
		get PUBLIC_ENV() {
			return mockPublicEnv;
		},
		get PUBLIC_MIXPANEL_TOKEN() {
			return mockPublicMixpanelToken;
		}
	}
}));

const mockInit = vi.fn();
const mockTrack = vi.fn();
const mockIdentify = vi.fn();
const mockPeopleSet = vi.fn();

vi.mock('mixpanel-browser', () => ({
	default: {
		init: (...args: unknown[]) => mockInit(...args),
		track: (...args: unknown[]) => mockTrack(...args),
		identify: (...args: unknown[]) => mockIdentify(...args),
		people: {
			set: (...args: unknown[]) => mockPeopleSet(...args)
		}
	}
}));

import { initMixpanelClient, track, identify, pageview, resetForTesting } from './mixpanel-client';

describe('initMixpanelClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicMixpanelToken = '';
		resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('is a no-op when environment is "test" (default in vitest)', () => {
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('is a no-op when environment is "local" (NODE_ENV=development, no PUBLIC_ENV)', () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('is a no-op when PUBLIC_MIXPANEL_TOKEN is absent', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = '';
		initMixpanelClient();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('calls mixpanel.init with token and privacy config in staging', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledOnce();
		expect(mockInit).toHaveBeenCalledWith('fake-token', expect.any(Object));
	});

	it('calls mixpanel.init with token and privacy config in production', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'production';
		mockPublicMixpanelToken = 'prod-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledOnce();
		expect(mockInit).toHaveBeenCalledWith('prod-token', expect.any(Object));
	});

	it('passes autocapture: false in init config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ autocapture: false })
		);
	});

	it('passes ip: false in init config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ ip: false })
		);
	});

	it('passes track_pageview: false in init config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ track_pageview: false })
		);
	});

	it('passes persistence: localStorage in init config', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		expect(mockInit).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ persistence: 'localStorage' })
		);
	});
});

describe('track', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicMixpanelToken = '';
		resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('is a no-op when not initialized', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		// initMixpanelClient not called — _initialized is false
		track('Test Event');
		expect(mockTrack).not.toHaveBeenCalled();
	});

	it('fires event after initialization', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		track('Test Event');
		expect(mockTrack).toHaveBeenCalledOnce();
	});

	it('auto-injects surface=web', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		track('Test Event');
		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ surface: 'web' })
		);
	});

	it('auto-injects environment from getClientEnvironment()', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		track('Test Event');
		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ environment: 'staging' })
		);
	});

	it('auto-injects user_id as null when no user identified', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		track('Test Event');
		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ user_id: null })
		);
	});

	it('auto-injects user_id after identify() is called', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		identify('user-abc');
		track('Test Event');
		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ user_id: 'user-abc' })
		);
	});

	it('merges caller-provided properties with standard properties', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		track('Setup Viewed', { setup_id: 'xyz' });
		expect(mockTrack).toHaveBeenCalledWith(
			'Setup Viewed',
			expect.objectContaining({ setup_id: 'xyz', surface: 'web' })
		);
	});

	it('swallows synchronous errors thrown by the SDK', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		mockTrack.mockImplementationOnce(() => {
			throw new Error('SDK exploded');
		});
		expect(() => track('Boom')).not.toThrow();
	});
});

describe('identify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicMixpanelToken = '';
		resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('is a no-op when not initialized', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		identify('user-123');
		expect(mockIdentify).not.toHaveBeenCalled();
		expect(mockPeopleSet).not.toHaveBeenCalled();
	});

	it('calls mixpanel.identify with userId', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		identify('user-123');
		expect(mockIdentify).toHaveBeenCalledWith('user-123');
	});

	it('calls mixpanel.people.set with traits', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		identify('user-123', { username: 'alice' });
		expect(mockPeopleSet).toHaveBeenCalledWith({ username: 'alice' });
	});

	it('calls mixpanel.people.set with empty object when no traits provided', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		identify('user-456');
		expect(mockPeopleSet).toHaveBeenCalledWith({});
	});

	it('swallows errors thrown by mixpanel.identify', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();
		mockIdentify.mockImplementationOnce(() => {
			throw new Error('identify exploded');
		});
		expect(() => identify('user-789')).not.toThrow();
	});
});

describe('pageview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicEnv = '';
		mockPublicMixpanelToken = '';
		resetForTesting();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('calls track with "Page Viewed" event name', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';
		initMixpanelClient();

		// Simulate browser window.location
		Object.defineProperty(globalThis, 'window', {
			value: { location: { pathname: '/explore' } },
			writable: true,
			configurable: true
		});

		pageview();
		expect(mockTrack).toHaveBeenCalledWith(
			'Page Viewed',
			expect.objectContaining({ path: '/explore' })
		);
	});
});
