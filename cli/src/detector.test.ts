import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectFiles, type DetectedFile } from './detector.js';

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-detector-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function mkfile(relPath: string, content = ''): void {
	const full = path.join(tmpDir, relPath);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, content, 'utf-8');
}

function find(files: DetectedFile[], filePath: string): DetectedFile | undefined {
	return files.find((f) => f.path === filePath);
}

function findAll(files: DetectedFile[], filePath: string): DetectedFile[] {
	return files.filter((f) => f.path === filePath);
}

type ExpectEntry = { path: string; tool: string | null; componentType: string };

function assertDetected(files: DetectedFile[], expected: ExpectEntry[]): void {
	for (const e of expected) {
		const match = files.find((f) => f.path === e.path && f.tool === e.tool);
		expect(match, `expected ${e.tool ?? 'shared'} detection for ${e.path}`).toBeDefined();
		expect(match!.componentType, `${e.path} componentType`).toBe(e.componentType);
	}
}

// ─── Empty / false positives / skipped dirs ──────────────────────────────────

describe('detectFiles — filters', () => {
	it('returns empty for unknown files and respects skipped directories', () => {
		// unknown files at root + arbitrary .md/.json anywhere
		mkfile('README.md');
		mkfile('src/index.ts');
		mkfile('package.json');
		mkfile('CONTRIBUTING.md');
		mkfile('CHANGELOG.md');
		mkfile('config.json');
		mkfile('settings.json');
		// files under every skipped directory must be ignored
		mkfile('node_modules/.claude/commands/foo.md', '# foo');
		mkfile('.git/CLAUDE.md', '# not real');
		mkfile('dist/.mcp.json', '{}');
		mkfile('build/CLAUDE.md', '# not real');
		mkfile('.svelte-kit/CLAUDE.md', '# not real');

		expect(detectFiles(tmpDir)).toEqual([]);
	});

	it('returns empty for an empty directory', () => {
		expect(detectFiles(tmpDir)).toEqual([]);
	});
});

// ─── isEmpty flag ─────────────────────────────────────────────────────────────

describe('detectFiles — isEmpty flag', () => {
	it('reflects file size (zero → true, non-zero → false)', () => {
		mkfile('CLAUDE.md', '');
		expect(find(detectFiles(tmpDir), 'CLAUDE.md')!.isEmpty).toBe(true);

		// fresh dir
		fs.rmSync(tmpDir, { recursive: true, force: true });
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-detector-test-'));
		mkfile('CLAUDE.md', '# hi');
		expect(find(detectFiles(tmpDir), 'CLAUDE.md')!.isEmpty).toBe(false);
	});
});

// ─── Per-agent detection (one comprehensive test per agent) ──────────────────

describe('detectFiles — claude-code', () => {
	it('detects all known claude-code paths with the right componentType', () => {
		mkfile('CLAUDE.md', '# project');
		mkfile('.claude/settings.json', '{}');
		mkfile('.claude/CLAUDE.md', '# global');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('.claude/commands/deploy.md', '# deploy');
		mkfile('.claude/commands/sub/helper.md', '# helper');
		mkfile('.claude/skills/test-helper.md', '# skill');
		mkfile('.claude/hooks/pre-commit.sh', '#!/bin/bash');
		mkfile('.claude/hooks/post-tool-use.py', '# hook');
		mkfile('.mcp.json', '{}');
		// decoys
		mkfile('.claude/commands/script.sh', '#!/bin/bash');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'CLAUDE.md', tool: 'claude-code', componentType: 'instruction' },
			{ path: '.claude/settings.json', tool: 'claude-code', componentType: 'instruction' },
			{ path: '.claude/CLAUDE.md', tool: 'claude-code', componentType: 'instruction' },
			{ path: '.claude/commands/review.md', tool: 'claude-code', componentType: 'command' },
			{ path: '.claude/commands/deploy.md', tool: 'claude-code', componentType: 'command' },
			{ path: '.claude/commands/sub/helper.md', tool: 'claude-code', componentType: 'command' },
			{ path: '.claude/skills/test-helper.md', tool: 'claude-code', componentType: 'skill' },
			{ path: '.claude/hooks/pre-commit.sh', tool: 'claude-code', componentType: 'hook' },
			{ path: '.claude/hooks/post-tool-use.py', tool: 'claude-code', componentType: 'hook' },
			{ path: '.mcp.json', tool: 'claude-code', componentType: 'mcp_server' }
		]);
		// decoy: non-.md scripts in commands/ are not detected
		expect(find(files, '.claude/commands/script.sh')).toBeUndefined();
	});
});

describe('detectFiles — codex', () => {
	it('detects all known codex paths', () => {
		mkfile('AGENTS.md', '# agents');
		mkfile('.codex/config.toml', '');
		mkfile('.codex/agents/my-agent.toml', '');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'AGENTS.md', tool: 'codex', componentType: 'instruction' },
			{ path: '.codex/agents/my-agent.toml', tool: 'codex', componentType: 'instruction' }
		]);
		// .codex/config.toml is detected as codex; exact componentType is not asserted here
		expect(findAll(files, '.codex/config.toml').some((f) => f.tool === 'codex')).toBe(true);
	});
});

describe('detectFiles — shared (.agents/skills)', () => {
	it('tags .agents/skills/**/*.md as shared (tool=null), not codex', () => {
		mkfile('.agents/skills/api-patterns/SKILL.md', '# api-patterns');
		mkfile('.agents/skills/testing/SKILL.md', '# testing');
		mkfile('.agents/skills/deep/nested/helper.md', '# nested');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.agents/skills/api-patterns/SKILL.md', tool: null, componentType: 'skill' },
			{ path: '.agents/skills/testing/SKILL.md', tool: null, componentType: 'skill' },
			{ path: '.agents/skills/deep/nested/helper.md', tool: null, componentType: 'skill' }
		]);
		// no entry should be misattributed to codex
		expect(files.every((f) => f.tool !== 'codex')).toBe(true);
	});
});

describe('detectFiles — copilot', () => {
	it('detects all known copilot paths and ignores arbitrary .github files', () => {
		mkfile('.github/copilot-instructions.md', '# copilot');
		mkfile('.github/copilot/instructions.md', '# instructions');
		mkfile('.github/copilot/mcp.json', '{}');
		mkfile('.github/copilot/agents.json', '{}');
		mkfile('.github/copilot/setup.sh', '#!/bin/bash');
		mkfile('.github/copilot/prompts/my-prompt.md', '# prompt');
		mkfile('.vscode/settings.json', '{}');
		// decoys
		mkfile('.github/workflows/ci.yml', '');
		mkfile('.github/PULL_REQUEST_TEMPLATE.md', '');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.github/copilot-instructions.md', tool: 'copilot', componentType: 'instruction' },
			{ path: '.github/copilot/instructions.md', tool: 'copilot', componentType: 'instruction' },
			{ path: '.github/copilot/mcp.json', tool: 'copilot', componentType: 'mcp_server' },
			{ path: '.github/copilot/setup.sh', tool: 'copilot', componentType: 'hook' },
			{ path: '.github/copilot/prompts/my-prompt.md', tool: 'copilot', componentType: 'command' },
			{ path: '.vscode/settings.json', tool: 'copilot', componentType: 'instruction' }
		]);
		// agents.json is copilot-tagged (componentType not asserted)
		expect(find(files, '.github/copilot/agents.json')?.tool).toBe('copilot');
		// decoys
		expect(find(files, '.github/workflows/ci.yml')).toBeUndefined();
		expect(find(files, '.github/PULL_REQUEST_TEMPLATE.md')).toBeUndefined();
	});
});

describe('detectFiles — cursor', () => {
	it('detects all known cursor paths', () => {
		mkfile('.cursorrules', 'always write tests');
		mkfile('.cursorignore', 'node_modules/');
		mkfile('.cursorindexingignore', '*.log');
		mkfile('.cursor/rules/my-rule.mdc', '# rule');
		mkfile('.cursor/rules/coding-style.md', '# style');
		mkfile('.cursor/mcp.json', '{}');
		mkfile('.cursor/hooks.json', '{}');
		mkfile('.cursor/commands/refactor.md', '# refactor');
		mkfile('.cursor/skills/my-skill.md', '# skill');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.cursorrules', tool: 'cursor', componentType: 'instruction' },
			{ path: '.cursor/mcp.json', tool: 'cursor', componentType: 'mcp_server' },
			{ path: '.cursor/hooks.json', tool: 'cursor', componentType: 'hook' },
			{ path: '.cursor/commands/refactor.md', tool: 'cursor', componentType: 'command' },
			{ path: '.cursor/skills/my-skill.md', tool: 'cursor', componentType: 'skill' }
		]);
		// .cursorignore / .cursorindexingignore tagged as cursor
		expect(find(files, '.cursorignore')?.tool).toBe('cursor');
		expect(find(files, '.cursorindexingignore')?.tool).toBe('cursor');
		// .mdc and .md rules both detected as cursor instruction
		for (const p of ['.cursor/rules/my-rule.mdc', '.cursor/rules/coding-style.md']) {
			const match = findAll(files, p).find((f) => f.tool === 'cursor');
			expect(match, `missing cursor match for ${p}`).toBeDefined();
			expect(match!.componentType).toBe('instruction');
		}
	});
});

describe('detectFiles — gemini', () => {
	it('detects all known gemini paths', () => {
		mkfile('GEMINI.md', '# gemini');
		mkfile('.geminiignore', '*.log');
		mkfile('.gemini/settings.json', '{}');
		mkfile('.gemini/commands/build.toml', '');
		mkfile('.gemini/skills/analyze.md', '');
		mkfile('.gemini/policies/security.toml', '');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'GEMINI.md', tool: 'gemini', componentType: 'instruction' },
			{ path: '.gemini/commands/build.toml', tool: 'gemini', componentType: 'command' },
			{ path: '.gemini/skills/analyze.md', tool: 'gemini', componentType: 'skill' },
			{ path: '.gemini/policies/security.toml', tool: 'gemini', componentType: 'instruction' }
		]);
		expect(find(files, '.geminiignore')?.tool).toBe('gemini');
		expect(findAll(files, '.gemini/settings.json').some((f) => f.tool === 'gemini')).toBe(true);
	});
});

describe('detectFiles — opencode', () => {
	it('detects all known opencode paths', () => {
		mkfile('opencode.md', '# opencode');
		mkfile('.opencode.json', '{}');
		mkfile('.opencode/commands/deploy.md', '# deploy');

		assertDetected(detectFiles(tmpDir), [
			{ path: 'opencode.md', tool: 'opencode', componentType: 'instruction' },
			{ path: '.opencode.json', tool: 'opencode', componentType: 'instruction' },
			{ path: '.opencode/commands/deploy.md', tool: 'opencode', componentType: 'command' }
		]);
	});
});

// ─── Multi-agent invariants ──────────────────────────────────────────────────

describe('detectFiles — multi-agent projects', () => {
	it('detects files from all six agents and excludes unrelated files in the same project', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('AGENTS.md', '# agents');
		mkfile('.github/copilot-instructions.md', '# copilot');
		mkfile('.cursorrules', 'rules');
		mkfile('GEMINI.md', '# gemini');
		mkfile('opencode.md', '# opencode');
		mkfile('README.md', '# readme');
		mkfile('src/index.ts', '');

		const files = detectFiles(tmpDir);
		const agents = new Set(files.map((f) => f.tool));
		for (const a of ['claude-code', 'codex', 'copilot', 'cursor', 'gemini', 'opencode']) {
			expect(agents).toContain(a);
		}
		expect(find(files, 'README.md')).toBeUndefined();
		expect(find(files, 'src/index.ts')).toBeUndefined();
	});

	it('produces at most one entry per (path, agent) pair and allows same path under different agents', () => {
		mkfile('.claude/settings.json', '{}');
		mkfile('.claude/skills/my-skill.md', '# skill');
		mkfile('.cursor/skills/my-skill.md', '# skill');
		const files = detectFiles(tmpDir);

		const claudeSettings = files.filter(
			(f) => f.path === '.claude/settings.json' && f.tool === 'claude-code'
		);
		expect(claudeSettings).toHaveLength(1);

		const claudeSkill = files.find(
			(f) => f.path === '.claude/skills/my-skill.md' && f.tool === 'claude-code'
		);
		const cursorSkill = files.find(
			(f) => f.path === '.cursor/skills/my-skill.md' && f.tool === 'cursor'
		);
		expect(claudeSkill).toBeDefined();
		expect(cursorSkill).toBeDefined();
	});

	it('does not duplicate root-level agent files (CLAUDE.md, .mcp.json, etc.)', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('.mcp.json', '{}');
		mkfile('AGENTS.md', '# agents');
		mkfile('.cursorrules', 'rules');
		mkfile('.claude/settings.json', '{}');
		const files = detectFiles(tmpDir);

		for (const p of ['CLAUDE.md', '.mcp.json', 'AGENTS.md', '.cursorrules']) {
			expect(findAll(files, p), `${p} should be detected exactly once`).toHaveLength(1);
		}
	});
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('detectFiles — edge cases', () => {
	it('detects real configs alongside 50+ level deep irrelevant trees and decoys', () => {
		mkfile('CLAUDE.md', '# claude instructions');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('AGENTS.md', '# agents');
		mkfile('.cursor/rules/style.mdc', '# cursor rules');

		const deepSegments = Array.from({ length: 52 }, (_, i) => `d${i}`);
		const deepPath = `fake-deep/${deepSegments.join('/')}`;
		mkfile(`${deepPath}/CLAUDE.md`, '# decoy');
		mkfile(`${deepPath}/AGENTS.md`, '# decoy');
		mkfile('Library/Application Support/deep/path/CLAUDE.md', '# decoy');

		const files = detectFiles(tmpDir);
		expect(find(files, 'CLAUDE.md')).toBeDefined();
		expect(find(files, '.claude/commands/review.md')).toBeDefined();
		expect(find(files, 'AGENTS.md')).toBeDefined();
		const paths = files.map((f) => f.path);
		expect(paths.some((p) => p.startsWith('fake-deep/'))).toBe(false);
		expect(paths.some((p) => p.startsWith('Library/'))).toBe(false);
	});

	it('completes without hanging when a symlink loop exists inside a scan target', () => {
		mkfile('.claude/commands/review.md', '# review');
		const claudeDir = path.join(tmpDir, '.claude');
		fs.symlinkSync(claudeDir, path.join(claudeDir, 'loop'));

		let files: DetectedFile[] = [];
		expect(() => {
			files = detectFiles(tmpDir);
		}).not.toThrow();
		expect(find(files, '.claude/commands/review.md')).toBeDefined();
	});

	it.skipIf(process.getuid?.() === 0)(
		'skips unreadable directories and still returns results from accessible ones',
		() => {
			mkfile('CLAUDE.md', '# claude');
			mkfile('.cursor/rules/style.mdc', '# cursor rules');
			const restrictedDir = path.join(tmpDir, '.gemini');
			fs.mkdirSync(restrictedDir, { recursive: true });
			fs.chmodSync(restrictedDir, 0o000);

			try {
				expect(() => detectFiles(tmpDir)).not.toThrow();
				const files = detectFiles(tmpDir);
				expect(find(files, 'CLAUDE.md')).toBeDefined();
				expect(findAll(files, '.cursor/rules/style.mdc').length).toBeGreaterThanOrEqual(1);
			} finally {
				fs.chmodSync(restrictedDir, 0o755);
			}
		}
	);
});

// ─── Description field ────────────────────────────────────────────────────────

describe('detectFiles — description field', () => {
	it('includes a non-empty description and tags commands/skills correctly', () => {
		mkfile('CLAUDE.md', '');
		mkfile('.claude/commands/review.md', '');
		mkfile('.claude/skills/helper.md', '');
		const files = detectFiles(tmpDir);

		const claudeMd = find(files, 'CLAUDE.md')!;
		expect(claudeMd.description).toBeTruthy();
		expect(typeof claudeMd.description).toBe('string');

		expect(find(files, '.claude/commands/review.md')!.description).toMatch(/command/i);
		expect(find(files, '.claude/skills/helper.md')!.description).toMatch(/skill/i);
	});
});
