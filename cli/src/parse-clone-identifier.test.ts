import { describe, it, expect } from 'vitest';
import { parseCloneIdentifier } from './parse-clone-identifier.js';

describe('parseCloneIdentifier — accepts', () => {
	it('parses two-part owner/slug as personal', () => {
		expect(parseCloneIdentifier('alice/my-setup')).toEqual({
			kind: 'personal',
			owner: 'alice',
			slug: 'my-setup'
		});
		expect(parseCloneIdentifier('bob/cool-workflow')).toEqual({
			kind: 'personal',
			owner: 'bob',
			slug: 'cool-workflow'
		});
	});

	it('parses three-part org/team/slug as team', () => {
		expect(parseCloneIdentifier('org/acme/shared')).toEqual({
			kind: 'team',
			teamSlug: 'acme',
			setupSlug: 'shared'
		});
		expect(parseCloneIdentifier('org/my-team/my-setup')).toEqual({
			kind: 'team',
			teamSlug: 'my-team',
			setupSlug: 'my-setup'
		});
	});

	it('parses HTTPS URLs (personal and team, with/without trailing slash)', () => {
		expect(parseCloneIdentifier('https://coati.sh/alice/my-setup')).toEqual({
			kind: 'personal',
			owner: 'alice',
			slug: 'my-setup'
		});
		expect(parseCloneIdentifier('https://coati.sh/org/acme/shared')).toEqual({
			kind: 'team',
			teamSlug: 'acme',
			setupSlug: 'shared'
		});
		expect(parseCloneIdentifier('https://coati.sh/alice/my-setup/')).toEqual({
			kind: 'personal',
			owner: 'alice',
			slug: 'my-setup'
		});
		expect(parseCloneIdentifier('https://coati.sh/org/acme/shared/')).toEqual({
			kind: 'team',
			teamSlug: 'acme',
			setupSlug: 'shared'
		});
	});
});

describe('parseCloneIdentifier — rejects', () => {
	it('rejects malformed plain inputs with the right error for each cause', () => {
		expect(() => parseCloneIdentifier('alicemysetup')).toThrow(/missing slash/);
		expect(() => parseCloneIdentifier('/my-setup')).toThrow(/leading slash/);
		expect(() => parseCloneIdentifier('alice/')).toThrow(/empty segment/);
		expect(() => parseCloneIdentifier('org/acme/')).toThrow(/empty segment/);
		expect(() => parseCloneIdentifier('alice//my-setup')).toThrow(/empty segment/);
		expect(() => parseCloneIdentifier('alice/my-setup/extra')).toThrow(/extra path segments/);
		expect(() => parseCloneIdentifier('a/b/c/d')).toThrow(/too many path segments/);
		expect(() => parseCloneIdentifier('')).toThrow();
	});

	it('rejects malformed URLs with the right error for each cause', () => {
		expect(() => parseCloneIdentifier('http://coati.sh/alice/my-setup')).toThrow(/Non-HTTPS/);
		expect(() => parseCloneIdentifier('https://')).toThrow(/Invalid URL/);
		expect(() => parseCloneIdentifier('https://coati.sh/alice/my-setup/extra')).toThrow(
			/extra path segments/
		);
		expect(() => parseCloneIdentifier('https://coati.sh/a/b/c/d')).toThrow(/extra path segments/);
	});

	it('rejects segments with uppercase letters', () => {
		expect(() => parseCloneIdentifier('USER/setup')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('alice/My-Setup')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('org/ACME/shared')).toThrow(/invalid/i);
	});

	it('rejects segments with a leading dash', () => {
		expect(() => parseCloneIdentifier('-leading/setup')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('alice/-leading')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('org/-team/setup')).toThrow(/invalid/i);
	});

	it('rejects segments with non-alphanumeric characters', () => {
		expect(() => parseCloneIdentifier('alice/weird?slug')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('alice/weird.slug')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('alice/weird#slug')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('alice/..')).toThrow(/invalid/i);
	});

	it('rejects URLs whose segments fail charset validation', () => {
		expect(() => parseCloneIdentifier('https://coati.sh/USER/setup')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('https://coati.sh/org/ACME/shared')).toThrow(/invalid/i);
		expect(() => parseCloneIdentifier('https://coati.sh/alice/weird%20slug')).toThrow(/invalid/i);
	});
});
