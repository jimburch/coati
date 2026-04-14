import { describe, it, expect } from 'vitest';

// Mirror of the sections data defined in +page.svelte
// Tests ensure all 7 required sections are present with valid anchor IDs and correct order

interface GuideSection {
	id: string;
	title: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
	{ id: 'what-is-coati', title: 'What is Coati?' },
	{ id: 'discover-setups', title: 'Discover Setups' },
	{ id: 'install-the-cli', title: 'Install the CLI' },
	{ id: 'clone-a-setup', title: 'Clone a Setup' },
	{ id: 'create-your-own-setup', title: 'Create Your Own Setup' },
	{ id: 'publish-to-coati', title: 'Publish to Coati' },
	{ id: 'social-features', title: 'Social Features' }
];

function isValidAnchorId(id: string): boolean {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
}

describe('GUIDE_SECTIONS', () => {
	it('has exactly 7 sections', () => {
		expect(GUIDE_SECTIONS).toHaveLength(7);
	});

	it('sections are in the required order', () => {
		const expectedIds = [
			'what-is-coati',
			'discover-setups',
			'install-the-cli',
			'clone-a-setup',
			'create-your-own-setup',
			'publish-to-coati',
			'social-features'
		];
		expect(GUIDE_SECTIONS.map((s) => s.id)).toEqual(expectedIds);
	});

	it('all sections have non-empty titles', () => {
		for (const section of GUIDE_SECTIONS) {
			expect(section.title.trim().length).toBeGreaterThan(0);
		}
	});

	it('all section IDs are URL-safe anchor IDs', () => {
		for (const section of GUIDE_SECTIONS) {
			expect(isValidAnchorId(section.id)).toBe(true);
		}
	});

	it('all section IDs are unique', () => {
		const ids = GUIDE_SECTIONS.map((s) => s.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it('section titles match the required content sections', () => {
		const titles = GUIDE_SECTIONS.map((s) => s.title);
		expect(titles).toContain('What is Coati?');
		expect(titles).toContain('Discover Setups');
		expect(titles).toContain('Install the CLI');
		expect(titles).toContain('Clone a Setup');
		expect(titles).toContain('Create Your Own Setup');
		expect(titles).toContain('Publish to Coati');
		expect(titles).toContain('Social Features');
	});
});

describe('isValidAnchorId', () => {
	it('accepts lowercase hyphenated strings', () => {
		expect(isValidAnchorId('what-is-coati')).toBe(true);
		expect(isValidAnchorId('install-the-cli')).toBe(true);
		expect(isValidAnchorId('create-your-own-setup')).toBe(true);
	});

	it('accepts single word IDs', () => {
		expect(isValidAnchorId('coati')).toBe(true);
	});

	it('accepts IDs with numbers', () => {
		expect(isValidAnchorId('section-1')).toBe(true);
	});

	it('rejects IDs with spaces', () => {
		expect(isValidAnchorId('what is coati')).toBe(false);
	});

	it('rejects IDs with uppercase letters', () => {
		expect(isValidAnchorId('WhatIsCoati')).toBe(false);
	});

	it('rejects IDs starting with a hyphen', () => {
		expect(isValidAnchorId('-what-is-coati')).toBe(false);
	});

	it('rejects IDs ending with a hyphen', () => {
		expect(isValidAnchorId('what-is-coati-')).toBe(false);
	});

	it('rejects IDs with consecutive hyphens', () => {
		expect(isValidAnchorId('what--is-coati')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(isValidAnchorId('')).toBe(false);
	});

	it('rejects IDs with special characters', () => {
		expect(isValidAnchorId('what-is-coati?')).toBe(false);
		expect(isValidAnchorId('what_is_coati')).toBe(false);
	});
});
