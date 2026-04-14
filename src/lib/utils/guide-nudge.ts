import type { LayoutUser } from '$lib/types';

/** The localStorage key used to persist nudge dismissal. */
export const GUIDE_DISMISSED_KEY = 'coati_guide_dismissed';

/**
 * Returns true when the guide nudge should be visible.
 * Conditions: user is logged in, is beta-approved (or admin), and has not dismissed.
 */
export function shouldShowNudge(user: LayoutUser | null, dismissed: boolean): boolean {
	if (user === null) return false;
	if (!user.isBetaApproved && !user.isAdmin) return false;
	if (dismissed) return false;
	return true;
}

/**
 * Returns true when the current pathname is the guide page,
 * which triggers auto-dismissal.
 */
export function isGuidePath(pathname: string): boolean {
	return pathname === '/guide';
}
