import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

function getClientEnvironment(): 'local' | 'staging' | 'production' {
	if (env.PUBLIC_ENV === 'staging') return 'staging';
	if (env.PUBLIC_ENV === 'production') return 'production';
	return 'local';
}

export function initSentryBrowser(): void {
	const environment = getClientEnvironment();
	if (environment === 'local') return;

	const dsn = env.PUBLIC_SENTRY_DSN;
	if (!dsn) return;

	const version = env.PUBLIC_APP_VERSION || 'unknown';

	Sentry.init({
		dsn,
		environment,
		release: `coati-web@${version}`,
		sendDefaultPii: false,
		// No session replay — privacy posture requires minimal data collection
		integrations: []
	});
}
