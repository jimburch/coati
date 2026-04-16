export const RESERVED_USERNAMES = new Set([
	'org',
	'api',
	'explore',
	'admin',
	'settings',
	'team',
	'invite',
	'new',
	'feed',
	'auth',
	'health',
	'login',
	'logout',
	'register',
	'signup',
	'about',
	'help',
	'support',
	'contact',
	'privacy',
	'terms',
	'legal',
	'security',
	'billing',
	'pricing',
	'docs',
	'blog',
	'status',
	'cdn',
	'static',
	'assets',
	'public',
	'coati'
]);

export function isReservedUsername(username: string): boolean {
	return RESERVED_USERNAMES.has(username.toLowerCase());
}

export function sanitizeUsername(username: string, githubId: number): string {
	const lower = username.toLowerCase();
	if (!isReservedUsername(lower)) {
		return lower;
	}
	return `${lower}${githubId}`;
}
