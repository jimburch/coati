import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import { getEnvironment } from './env';

export function initSentry(): void {
	const environment = getEnvironment();
	if (environment === 'local' || environment === 'test') return;

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
