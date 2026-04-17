import { describe, it, expect } from 'vitest';
import { requireAuth, requireApiAuth, requireAdmin, requireBetaFeatures } from './guards';
import type { RequestEvent } from '@sveltejs/kit';

function makeEvent(user: unknown = null): RequestEvent {
	return { locals: { user, session: user ? { id: 'sess-1' } : null } } as unknown as RequestEvent;
}

function makeBetaUser(hasBetaFeatures: boolean) {
	return { id: 'u1', username: 'test', isAdmin: false, hasBetaFeatures };
}

describe('auth guards', () => {
	describe('requireAuth', () => {
		it('returns user when authenticated', () => {
			const user = { id: 'u1', username: 'test', isAdmin: false };
			const result = requireAuth(makeEvent(user));
			expect(result).toBe(user);
		});

		it('throws redirect when not authenticated', () => {
			expect(() => requireAuth(makeEvent())).toThrow();
			try {
				requireAuth(makeEvent());
			} catch (e: unknown) {
				// SvelteKit redirect throws a special object
				expect((e as { status: number }).status).toBe(302);
				expect((e as { location: string }).location).toBe('/auth/login/github');
			}
		});
	});

	describe('requireApiAuth', () => {
		it('returns user when authenticated', () => {
			const user = { id: 'u1', username: 'test', isAdmin: false };
			const result = requireApiAuth(makeEvent(user));
			expect(result).toBe(user);
		});

		it('returns 401 Response when not authenticated', async () => {
			const result = requireApiAuth(makeEvent());
			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(401);
			const body = await (result as Response).json();
			expect(body.code).toBe('UNAUTHORIZED');
		});
	});

	describe('requireAdmin', () => {
		it('returns user when authenticated and admin', () => {
			const user = { id: 'u1', username: 'admin', isAdmin: true };
			const result = requireAdmin(makeEvent(user));
			expect(result).toBe(user);
		});

		it('returns 403 when authenticated but not admin', async () => {
			const user = { id: 'u1', username: 'test', isAdmin: false };
			const result = requireAdmin(makeEvent(user));
			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(403);
			const body = await (result as Response).json();
			expect(body.code).toBe('FORBIDDEN');
		});

		it('returns 401 when not authenticated', async () => {
			const result = requireAdmin(makeEvent());
			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(401);
		});
	});

	describe('requireBetaFeatures', () => {
		it('returns user when authenticated and hasBetaFeatures is true', () => {
			const user = makeBetaUser(true);
			const result = requireBetaFeatures(makeEvent(user));
			expect(result).toBe(user);
		});

		it('returns 403 when authenticated but hasBetaFeatures is false', async () => {
			const user = makeBetaUser(false);
			const result = requireBetaFeatures(makeEvent(user));
			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(403);
			const body = await (result as Response).json();
			expect(body.code).toBe('FORBIDDEN');
		});

		it('returns 401 when not authenticated', async () => {
			const result = requireBetaFeatures(makeEvent());
			expect(result).toBeInstanceOf(Response);
			expect((result as Response).status).toBe(401);
		});
	});
});
