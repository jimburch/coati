import { describe, it, expect } from 'vitest';
import { setupsPath, teamSetupsPath } from './api-paths.js';

describe('setupsPath', () => {
	it('builds a personal setup path', () => {
		expect(setupsPath('alice', 'my-setup')).toBe('/setups/alice/my-setup');
	});

	it('url-encodes each segment independently', () => {
		// Slashes in a segment must not escape into the path structure.
		expect(setupsPath('alice', 'foo/bar')).toBe('/setups/alice/foo%2Fbar');
		expect(setupsPath('foo bar', 'baz')).toBe('/setups/foo%20bar/baz');
	});

	it('encodes characters that would alter URL structure', () => {
		expect(setupsPath('alice', 'weird?slug')).toBe('/setups/alice/weird%3Fslug');
		expect(setupsPath('alice', 'weird#slug')).toBe('/setups/alice/weird%23slug');
		expect(setupsPath('alice', '..')).toBe('/setups/alice/..');
		expect(setupsPath('alice', 'a&b=c')).toBe('/setups/alice/a%26b%3Dc');
	});
});

describe('teamSetupsPath', () => {
	it('builds a team setup path', () => {
		expect(teamSetupsPath('acme', 'shared')).toBe('/teams/acme/setups/shared');
	});

	it('url-encodes each segment independently', () => {
		expect(teamSetupsPath('team/bad', 'setup')).toBe('/teams/team%2Fbad/setups/setup');
		expect(teamSetupsPath('acme', 'a?b')).toBe('/teams/acme/setups/a%3Fb');
	});
});
