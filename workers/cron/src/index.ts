import { withSentry, type CloudflareOptions } from '@sentry/cloudflare';
import postgres from 'postgres';

/**
 * Refreshes the trending materialized view. Kept out of the SvelteKit Worker
 * so the web bundle does not include a second entry point. Production runs
 * this every 2 hours; dev has no cron trigger.
 *
 * fetch_types is false because this statement returns no rows to parse.
 */
async function refreshTrending(env: Env): Promise<void> {
	const client = postgres(env.HYPERDRIVE.connectionString, {
		max: 5,
		fetch_types: false,
		prepare: true
	});
	try {
		await client.unsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY trending_setups_mv');
	} finally {
		await client.end({ timeout: 5 });
	}
}

const handler: ExportedHandler<Env> = {
	async scheduled(_controller, env) {
		await refreshTrending(env);
	}
};

function sentryOptions(env: Env): CloudflareOptions | undefined {
	if (!env.PUBLIC_SENTRY_DSN) return undefined;
	return {
		dsn: env.PUBLIC_SENTRY_DSN,
		environment: env.PUBLIC_ENV,
		release: `coati-cron@${env.PUBLIC_APP_VERSION || 'unknown'}`,
		sendDefaultPii: false
	};
}

export default withSentry(sentryOptions, handler);
