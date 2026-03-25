import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { AGENTS } from '@coati/agents-registry';

describe('agent SVG icons', () => {
	it('has an SVG file for every agent in the registry', () => {
		for (const agent of AGENTS) {
			const iconPath = resolve('src/lib/assets/agents', `${agent.slug}.svg`);
			expect(existsSync(iconPath), `Missing SVG for agent slug: ${agent.slug}`).toBe(true);
		}
	});

	it('covers all six launch agents', () => {
		const slugs = AGENTS.map((a) => a.slug);
		expect(slugs).toContain('claude-code');
		expect(slugs).toContain('codex');
		expect(slugs).toContain('copilot');
		expect(slugs).toContain('cursor');
		expect(slugs).toContain('gemini');
		expect(slugs).toContain('opencode');
	});
});
