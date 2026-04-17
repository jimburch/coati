import { describe, it, expect } from 'vitest';
import type { LayoutUser } from '$lib/types';
import { GUIDE_DISMISSED_KEY, shouldShowNudge, isGuidePath } from '$lib/utils/guide-nudge';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const betaUser: LayoutUser = {
	id: 'user-1',
	username: 'alice',
	avatarUrl: 'https://example.com/avatar.png',
	bio: null,
	isBetaApproved: true,
	isAdmin: false,
	hasBetaFeatures: false
};

const adminUser: LayoutUser = {
	id: 'user-2',
	username: 'bob',
	avatarUrl: 'https://example.com/avatar2.png',
	bio: null,
	isBetaApproved: false,
	isAdmin: true,
	hasBetaFeatures: false
};

const nonBetaUser: LayoutUser = {
	id: 'user-3',
	username: 'carol',
	avatarUrl: 'https://example.com/avatar3.png',
	bio: null,
	isBetaApproved: false,
	isAdmin: false,
	hasBetaFeatures: false
};

// ─── shouldShowNudge ─────────────────────────────────────────────────────────

describe('shouldShowNudge', () => {
	it('returns false when user is null (logged out)', () => {
		expect(shouldShowNudge(null, false)).toBe(false);
	});

	it('returns false when user is not beta-approved and not admin', () => {
		expect(shouldShowNudge(nonBetaUser, false)).toBe(false);
	});

	it('returns true for a beta-approved user who has not dismissed', () => {
		expect(shouldShowNudge(betaUser, false)).toBe(true);
	});

	it('returns true for an admin user who has not dismissed', () => {
		expect(shouldShowNudge(adminUser, false)).toBe(true);
	});

	it('returns false for a beta-approved user who has dismissed', () => {
		expect(shouldShowNudge(betaUser, true)).toBe(false);
	});

	it('returns false for an admin user who has dismissed', () => {
		expect(shouldShowNudge(adminUser, true)).toBe(false);
	});

	it('CTA links to /guide — isGuidePath correctly identifies the guide URL', () => {
		// The CTA href="/guide" matches the auto-dismiss guard
		expect(isGuidePath('/guide')).toBe(true);
	});
});

// ─── isGuidePath ─────────────────────────────────────────────────────────────

describe('isGuidePath', () => {
	it('returns true for /guide', () => {
		expect(isGuidePath('/guide')).toBe(true);
	});

	it('returns false for /', () => {
		expect(isGuidePath('/')).toBe(false);
	});

	it('returns false for /guide/section (sub-paths)', () => {
		expect(isGuidePath('/guide/section')).toBe(false);
	});

	it('returns false for /explore', () => {
		expect(isGuidePath('/explore')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isGuidePath('')).toBe(false);
	});
});

// ─── GUIDE_DISMISSED_KEY ─────────────────────────────────────────────────────

describe('GUIDE_DISMISSED_KEY', () => {
	it('is the expected localStorage key', () => {
		expect(GUIDE_DISMISSED_KEY).toBe('coati_guide_dismissed');
	});
});
