/// <reference types="@sveltejs/adapter-cloudflare" />
import type { User, Session } from '$lib/types';
import type { Database } from '$lib/server/db';

declare global {
	var __APP_VERSION__: string;

	namespace App {
		interface Platform {
			env: Env;
		}
		interface Locals {
			user: User | null;
			session: Session | null;
			surface: 'web' | 'cli';
			cliVersion: string | null;
			/** Per-request Drizzle client when Hyperdrive is available. */
			db?: Database;
		}
	}
}

export {};
