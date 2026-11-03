import { describe, it, expect } from 'vitest';
import { COMPONENT_TYPE_VALUES } from '@coati/validation';
import { AGENTS, AGENTS_BY_SLUG, SHARED_GLOBS, matchesGlob } from './index.js';

const SLUGS = ['claude-code', 'codex', 'copilot', 'cursor', 'gemini', 'opencode', 'antigravity'];

describe('registry shape', () => {
	it('has the six launch Agents plus antigravity', () => {
		expect(AGENTS.map((a) => a.slug)).toEqual(SLUGS);
		expect(AGENTS_BY_SLUG.antigravity.displayName).toBe('Antigravity');
		expect(AGENTS_BY_SLUG.antigravity.icon).toBe('antigravity.svg');
	});

	it('uses only ComponentTypes from @coati/validation, including config', () => {
		const used = new Set<string>();
		for (const agent of AGENTS) {
			for (const m of [...agent.projectGlobs, ...agent.globalGlobs]) used.add(m.componentType);
			for (const f of agent.settingsFiles) for (const s of f.selectors) used.add(s.componentType);
		}
		for (const t of used) expect(COMPONENT_TYPE_VALUES).toContain(t);
		expect(used).toContain('config');
	});

	it('keeps every Settings file out of the glob lists', () => {
		for (const agent of AGENTS) {
			for (const file of agent.settingsFiles) {
				const globs = file.placement === 'global' ? agent.globalGlobs : agent.projectGlobs;
				for (const other of AGENTS) {
					const list = file.placement === 'global' ? other.globalGlobs : other.projectGlobs;
					for (const m of list) {
						expect(
							matchesGlob(file.glob, m.glob),
							`${other.slug} glob ${m.glob} claims ${file.glob}`
						).toBe(false);
					}
				}
				expect(globs.length).toBeGreaterThan(0);
				expect(['json', 'jsonc', 'toml']).toContain(file.format);
			}
		}
	});

	it('gives every shared glob a placement and a list of readers', () => {
		for (const shared of SHARED_GLOBS) {
			expect(['project', 'global']).toContain(shared.placement);
			expect(shared.readers.length).toBeGreaterThan(1);
			for (const r of shared.readers) expect(SLUGS).toContain(r);
		}
		const agentsMd = SHARED_GLOBS.find((s) => s.glob === 'AGENTS.md');
		expect(agentsMd?.readers).toEqual(['codex', 'copilot', 'cursor', 'opencode', 'antigravity']);
		const globalSkills = SHARED_GLOBS.find(
			(s) => s.glob === '.agents/skills/**' && s.placement === 'global'
		);
		expect(globalSkills?.readers).not.toContain('antigravity');
	});

	it('detects antigravity by its own home dirs and agy, not the shared ~/.gemini', () => {
		const { detection, scopes } = AGENTS_BY_SLUG.antigravity;
		expect(detection.homePaths).toEqual(['.gemini/antigravity-cli', '.gemini/config']);
		expect(detection.cliCommands).toEqual(['agy']);
		expect(scopes).toEqual(['project', 'global']);
	});

	it('gives copilot a global scope under ~/.copilot', () => {
		expect(AGENTS_BY_SLUG.copilot.scopes).toEqual(['project', 'global']);
		expect(AGENTS_BY_SLUG.copilot.detection.homePaths).toEqual(['.copilot']);
	});
});
