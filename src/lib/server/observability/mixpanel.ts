import Mixpanel from 'mixpanel';
import { env } from '$env/dynamic/public';
import { getEnvironment } from './env';

type MixpanelClient = ReturnType<typeof Mixpanel.init>;

let _client: MixpanelClient | null = null;
let _initialized = false;

function getClient(): MixpanelClient | null {
	if (_initialized) return _client;
	_initialized = true;

	const environment = getEnvironment();
	if (environment === 'local' || environment === 'test') return null;

	const token = env.PUBLIC_MIXPANEL_TOKEN;
	if (!token) return null;

	_client = Mixpanel.init(token, {
		// Do not send IP — geo must not be derived from server requests
		protocol: 'https'
	});

	return _client;
}

export function track(
	eventName: string,
	properties: object = {},
	ctx: { locals: App.Locals }
): void {
	try {
		const mp = getClient();
		if (!mp) return;

		const environment = getEnvironment();
		const userId = ctx.locals.user?.id ?? null;

		const standardProps = {
			surface: ctx.locals.surface,
			environment,
			cli_version: ctx.locals.cliVersion ?? null,
			user_id: userId,
			distinct_id: userId ?? 'anonymous'
		};

		mp.track(eventName, { ...standardProps, ...properties });
	} catch {
		// Swallow errors — telemetry must never crash an API route
	}
}

export function identify(userId: string, traits: object = {}): void {
	try {
		const mp = getClient();
		if (!mp) return;

		mp.people.set(userId, { ...traits });
	} catch {
		// Swallow errors — telemetry must never crash a caller
	}
}

/** Reset lazy-init state. Only for use in tests. */
export function resetForTesting(): void {
	_client = null;
	_initialized = false;
}
