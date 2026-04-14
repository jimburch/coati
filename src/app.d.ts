import type { User, Session } from '$lib/types';

declare global {
	var __APP_VERSION__: string;

	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

export {};
