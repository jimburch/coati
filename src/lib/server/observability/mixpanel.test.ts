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

const mockTrack = vi.fn();
const mockPeopleSet = vi.fn();
const mockInit = vi.fn();

vi.mock('mixpanel', () => ({
	default: {
		init: (...args: unknown[]) => {
			mockInit(...args);
			return {
				track: (...trackArgs: unknown[]) => mockTrack(...trackArgs),
				people: {
					set: (...setArgs: unknown[]) => mockPeopleSet(...setArgs)
				}
			};
		}
	}
}));

import { track, identify, resetForTesting } from './mixpanel';

function makeMockLocals(overrides: Partial<App.Locals> = {}): App.Locals {
	return {
		user: null,
		session: null,
		surface: 'web',
		cliVersion: null,
		...overrides
	} as App.Locals;
}

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

	it('is a no-op when environment is "local"', () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockPublicEnv = '';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals() });

		expect(mockInit).not.toHaveBeenCalled();
		expect(mockTrack).not.toHaveBeenCalled();
	});

	it('is a no-op when environment is "test"', () => {
		// vitest sets NODE_ENV=test by default
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals() });

		expect(mockInit).not.toHaveBeenCalled();
		expect(mockTrack).not.toHaveBeenCalled();
	});

	it('initializes SDK lazily on first track call in staging', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals() });

		expect(mockInit).toHaveBeenCalledOnce();
		expect(mockInit).toHaveBeenCalledWith('fake-token', expect.any(Object));
	});

	it('does not reinitialize SDK on subsequent calls', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Event One', {}, { locals: makeMockLocals() });
		track('Event Two', {}, { locals: makeMockLocals() });

		expect(mockInit).toHaveBeenCalledOnce();
	});

	it('injects surface from ctx.locals', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals({ surface: 'cli' }) });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ surface: 'cli' })
		);
	});

	it('injects environment from getEnvironment()', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals() });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ environment: 'staging' })
		);
	});

	it('injects cli_version from ctx.locals when present', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals({ surface: 'cli', cliVersion: '1.2.3' }) });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ cli_version: '1.2.3' })
		);
	});

	it('injects cli_version as null when not a CLI request', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals({ surface: 'web', cliVersion: null }) });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ cli_version: null })
		);
	});

	it('injects user_id from ctx.locals.user when user is present', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		const user = { id: 'user-123' } as App.Locals['user'];
		track('Test Event', {}, { locals: makeMockLocals({ user }) });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ user_id: 'user-123' })
		);
	});

	it('injects user_id as null when user is not authenticated', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals({ user: null }) });

		expect(mockTrack).toHaveBeenCalledWith(
			'Test Event',
			expect.objectContaining({ user_id: null })
		);
	});

	it('merges caller-provided properties with standard properties', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Setup Cloned', { setup_id: 'abc' }, { locals: makeMockLocals() });

		expect(mockTrack).toHaveBeenCalledWith(
			'Setup Cloned',
			expect.objectContaining({ setup_id: 'abc', surface: 'web', environment: 'staging' })
		);
	});

	it('does not pass IP field in track payload', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		track('Test Event', {}, { locals: makeMockLocals() });

		const callProperties = mockTrack.mock.calls[0][1];
		expect(callProperties).not.toHaveProperty('ip');
		expect(callProperties).not.toHaveProperty('$ip');
	});

	it('swallows synchronous errors thrown by the SDK', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		mockTrack.mockImplementationOnce(() => {
			throw new Error('SDK exploded');
		});

		// Should not throw
		expect(() => {
			track('Boom Event', { bad_prop: undefined }, { locals: makeMockLocals() });
		}).not.toThrow();
	});

	it('is a no-op when PUBLIC_MIXPANEL_TOKEN is absent', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = '';

		track('Test Event', {}, { locals: makeMockLocals() });

		expect(mockInit).not.toHaveBeenCalled();
		expect(mockTrack).not.toHaveBeenCalled();
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

	it('is a no-op when environment is "test"', () => {
		mockPublicMixpanelToken = 'fake-token';

		identify('user-123', { $name: 'Alice' });

		expect(mockPeopleSet).not.toHaveBeenCalled();
	});

	it('calls people.set in staging with userId and traits', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		identify('user-123', { $name: 'Alice' });

		expect(mockPeopleSet).toHaveBeenCalledWith('user-123', { $name: 'Alice' });
	});

	it('calls people.set with empty traits when none provided', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		identify('user-456');

		expect(mockPeopleSet).toHaveBeenCalledWith('user-456', {});
	});

	it('swallows errors thrown by people.set', () => {
		vi.stubEnv('NODE_ENV', 'production');
		mockPublicEnv = 'staging';
		mockPublicMixpanelToken = 'fake-token';

		mockPeopleSet.mockImplementationOnce(() => {
			throw new Error('people.set exploded');
		});

		expect(() => {
			identify('user-789', { $name: 'Bob' });
		}).not.toThrow();
	});
});
