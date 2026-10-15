import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import { getEnvironment } from './env';

export function buildSentryOptions() {
	const environment = getEnvironment();
	if (environment === 'local' || environment === 'test') return null;

	const dsn = env.PUBLIC_SENTRY_DSN;
	if (!dsn) return null;

	const version = env.PUBLIC_APP_VERSION || 'unknown';

	return {
		dsn,
		environment,
		release: `coati-web@${version}`,
		sendDefaultPii: false as const
	};
}

/** Used by unit tests and any non-Workers caller. Request handling uses `buildSentryOptions`. */
export function initSentry(): void {
	const options = buildSentryOptions();
	if (!options) return;

	Sentry.init({
		...options,
		// No session replay — privacy posture requires minimal data collection
		integrations: []
	});
}

export function setSentryUser(user: { id: string; username: string }): void {
	Sentry.setUser({ id: user.id, username: user.username });
}

export function addSentryBreadcrumb(
	message: string,
	category?: string,
	data?: Record<string, unknown>
): void {
	Sentry.addBreadcrumb({ message, category, data });
}
