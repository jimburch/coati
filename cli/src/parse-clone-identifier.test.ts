import { describe, it, expect } from 'vitest';
import { parseCloneIdentifier } from './parse-clone-identifier.js';

describe('parseCloneIdentifier — personal (two-part)', () => {
	it('parses alice/my-setup as personal', () => {
		const result = parseCloneIdentifier('alice/my-setup');
		expect(result).toEqual({ kind: 'personal', owner: 'alice', slug: 'my-setup' });
	});

	it('parses any two-part owner/slug as personal', () => {
		const result = parseCloneIdentifier('bob/cool-workflow');
		expect(result).toEqual({ kind: 'personal', owner: 'bob', slug: 'cool-workflow' });
	});
});

describe('parseCloneIdentifier — team (three-part)', () => {
	it('parses org/acme/shared as team', () => {
		const result = parseCloneIdentifier('org/acme/shared');
		expect(result).toEqual({ kind: 'team', teamSlug: 'acme', setupSlug: 'shared' });
	});

	it('parses org/my-team/my-setup as team', () => {
		const result = parseCloneIdentifier('org/my-team/my-setup');
		expect(result).toEqual({ kind: 'team', teamSlug: 'my-team', setupSlug: 'my-setup' });
	});
});

describe('parseCloneIdentifier — HTTPS URLs', () => {
	it('parses https://coati.sh/alice/my-setup as personal', () => {
		const result = parseCloneIdentifier('https://coati.sh/alice/my-setup');
		expect(result).toEqual({ kind: 'personal', owner: 'alice', slug: 'my-setup' });
	});

	it('parses https://coati.sh/org/acme/shared as team', () => {
		const result = parseCloneIdentifier('https://coati.sh/org/acme/shared');
		expect(result).toEqual({ kind: 'team', teamSlug: 'acme', setupSlug: 'shared' });
	});

	it('accepts HTTPS URL with trailing slash (strips empty segment)', () => {
		const result = parseCloneIdentifier('https://coati.sh/alice/my-setup/');
		expect(result).toEqual({ kind: 'personal', owner: 'alice', slug: 'my-setup' });
	});

	it('accepts HTTPS team URL with trailing slash', () => {
		const result = parseCloneIdentifier('https://coati.sh/org/acme/shared/');
		expect(result).toEqual({ kind: 'team', teamSlug: 'acme', setupSlug: 'shared' });
	});
});

describe('parseCloneIdentifier — rejected inputs', () => {
	it('rejects plain input with no slash', () => {
		expect(() => parseCloneIdentifier('alicemysetup')).toThrow(/missing slash/);
	});

	it('rejects leading slash', () => {
		expect(() => parseCloneIdentifier('/my-setup')).toThrow(/leading slash/);
	});

	it('rejects trailing slash on two-part plain path', () => {
		expect(() => parseCloneIdentifier('alice/')).toThrow(/empty segment/);
	});

	it('rejects trailing slash on three-part plain path', () => {
		expect(() => parseCloneIdentifier('org/acme/')).toThrow(/empty segment/);
	});

	it('rejects consecutive slashes (empty inner segment)', () => {
		expect(() => parseCloneIdentifier('alice//my-setup')).toThrow(/empty segment/);
	});

	it('rejects three-part path where prefix is not org', () => {
		expect(() => parseCloneIdentifier('alice/my-setup/extra')).toThrow(/extra path segments/);
	});

	it('rejects four-part path', () => {
		expect(() => parseCloneIdentifier('a/b/c/d')).toThrow(/too many path segments/);
	});

	it('rejects HTTP URLs (non-HTTPS)', () => {
		expect(() => parseCloneIdentifier('http://coati.sh/alice/my-setup')).toThrow(/Non-HTTPS/);
	});

	it('rejects malformed URL', () => {
		expect(() => parseCloneIdentifier('https://')).toThrow(/Invalid URL/);
	});

	it('rejects HTTPS URL with extra path segments (not an org team URL)', () => {
		expect(() => parseCloneIdentifier('https://coati.sh/alice/my-setup/extra')).toThrow(
			/extra path segments/
		);
	});

	it('rejects HTTPS URL with more than 3 segments', () => {
		expect(() => parseCloneIdentifier('https://coati.sh/a/b/c/d')).toThrow(/extra path segments/);
	});

	it('rejects empty string', () => {
		expect(() => parseCloneIdentifier('')).toThrow();
	});
});
