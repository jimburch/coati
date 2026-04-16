import mixpanel from 'mixpanel-browser';
import { env } from '$env/dynamic/public';

let _initialized = false;
let _userId: string | null = null;

function getClientEnvironment(): 'local' | 'test' | 'staging' | 'production' {
	if (process.env.NODE_ENV === 'test') return 'test';
	if (env.PUBLIC_ENV === 'staging') return 'staging';
	if (env.PUBLIC_ENV === 'production') return 'production';
	return 'local';
}

export function initMixpanelClient(): void {
	const environment = getClientEnvironment();
	if (environment === 'local' || environment === 'test') return;

	const token = env.PUBLIC_MIXPANEL_TOKEN;
	if (!token) return;

	mixpanel.init(token, {
		autocapture: false,
		ip: false,
		track_pageview: false,
		persistence: 'localStorage'
	});

	_initialized = true;
}

export function track(eventName: string, properties: object = {}): void {
	try {
		if (!_initialized) return;

		const standardProps = {
			surface: 'web',
			environment: getClientEnvironment(),
			user_id: _userId
		};

		mixpanel.track(eventName, { ...standardProps, ...properties });
	} catch {
		// Swallow errors — telemetry must never crash the app
	}
}

export function identify(userId: string, traits: object = {}): void {
	try {
		if (!_initialized) return;
		_userId = userId;
		mixpanel.identify(userId);
		mixpanel.people.set(traits);
	} catch {
		// Swallow errors — telemetry must never crash the app
	}
}

export function pageview(): void {
	track('Page Viewed', { path: window.location.pathname });
}

/** Reset lazy-init state. Only for use in tests. */
export function resetForTesting(): void {
	_initialized = false;
	_userId = null;
}
