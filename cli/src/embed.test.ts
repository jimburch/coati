import { describe, expect, it } from 'vitest';
import { formatEmbedSnippet } from './embed.js';

describe('formatEmbedSnippet', () => {
	it('produces the correct markdown snippet with badge URL interpolated', () => {
		const setupUrl = 'https://coati.sh/jimburch/fullstack-claude';
		const result = formatEmbedSnippet(setupUrl);
		expect(result).toContain(
			'[![Clone on Coati](https://coati.sh/jimburch/fullstack-claude/badge.svg)](https://coati.sh/jimburch/fullstack-claude)'
		);
	});

	it('derives badge URL by appending /badge.svg to setup URL', () => {
		const setupUrl = 'https://coati.sh/alice/my-setup';
		const result = formatEmbedSnippet(setupUrl);
		expect(result).toContain('https://coati.sh/alice/my-setup/badge.svg');
	});

	it('includes an introductory sentence before the snippet', () => {
		const setupUrl = 'https://coati.sh/alice/my-setup';
		const result = formatEmbedSnippet(setupUrl);
		const lines = result.split('\n');
		expect(lines.length).toBeGreaterThan(1);
		expect(lines[0]).not.toMatch(/^\[!/);
		expect(lines[0].length).toBeGreaterThan(0);
	});

	it('returns a multi-line string', () => {
		const result = formatEmbedSnippet('https://coati.sh/alice/my-setup');
		expect(result).toContain('\n');
	});
});
