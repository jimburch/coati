import type { User, Session } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

export {};
