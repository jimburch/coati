import { SLUG_NAME_REGEX } from '@coati/validation';

export type CloneIdentifier =
	| { kind: 'personal'; owner: string; slug: string }
	| { kind: 'team'; teamSlug: string; setupSlug: string };

function assertValidSlug(segment: string, label: string): void {
	if (!SLUG_NAME_REGEX.test(segment)) {
		throw new Error(
			`Invalid ${label} "${segment}": must contain only lowercase letters, digits, and hyphens (e.g. my-setup)`
		);
	}
}

export function parseCloneIdentifier(input: string): CloneIdentifier {
	if (input.startsWith('http://') || input.startsWith('https://')) {
		let url: URL;
		try {
			url = new URL(input);
		} catch {
			throw new Error(
				'Invalid URL. Expected: https://coati.sh/owner/slug or https://coati.sh/org/team/setup'
			);
		}

		if (url.protocol !== 'https:') {
			throw new Error('Non-HTTPS URLs are not supported. Use https:// instead of http://');
		}

		const segments = url.pathname.split('/').filter(Boolean);

		if (segments.length === 2) {
			const owner = segments[0]!;
			const slug = segments[1]!;
			assertValidSlug(owner, 'owner');
			assertValidSlug(slug, 'slug');
			return { kind: 'personal', owner, slug };
		}

		if (segments.length === 3 && segments[0] === 'org') {
			const teamSlug = segments[1]!;
			const setupSlug = segments[2]!;
			assertValidSlug(teamSlug, 'team slug');
			assertValidSlug(setupSlug, 'slug');
			return { kind: 'team', teamSlug, setupSlug };
		}

		if (segments.length > 2) {
			throw new Error(
				'Invalid URL: extra path segments detected. Expected: https://coati.sh/owner/slug or https://coati.sh/org/team/setup'
			);
		}

		throw new Error(
			'Invalid URL. Expected: https://coati.sh/owner/slug or https://coati.sh/org/team/setup'
		);
	}

	// Plain path: split on '/' without filtering so empty segments are detectable
	const segments = input.split('/');

	if (segments.some((s) => s === '')) {
		if (segments[0] === '') {
			throw new Error(
				'Invalid format: leading slash is not allowed. Expected: owner/slug (e.g. alice/my-setup)'
			);
		}
		throw new Error(
			'Invalid format: empty segment detected (trailing slash or consecutive slashes). Expected: owner/slug (e.g. alice/my-setup)'
		);
	}

	if (segments.length === 2) {
		const owner = segments[0]!;
		const slug = segments[1]!;
		assertValidSlug(owner, 'owner');
		assertValidSlug(slug, 'slug');
		return { kind: 'personal', owner, slug };
	}

	if (segments.length === 3) {
		if (segments[0] !== 'org') {
			throw new Error(
				'Invalid format: extra path segments detected. Expected: owner/slug or org/team/setup (e.g. org/acme/my-setup)'
			);
		}
		const teamSlug = segments[1]!;
		const setupSlug = segments[2]!;
		assertValidSlug(teamSlug, 'team slug');
		assertValidSlug(setupSlug, 'slug');
		return { kind: 'team', teamSlug, setupSlug };
	}

	if (segments.length > 3) {
		throw new Error(
			'Invalid format: too many path segments. Expected: owner/slug or org/team/setup'
		);
	}

	// 1 segment (no slash at all)
	throw new Error('Invalid format: missing slash. Expected: owner/slug (e.g. alice/my-setup)');
}
