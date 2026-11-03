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
		mkfile('.claude/CLAUDE.md', '# project, nested');
		mkfile('.claude/rules/frontend/react.md', '# rule');
		mkfile('.claude/agents/reviewer.md', '# agent');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('.claude/commands/sub/helper.md', '# helper');
		mkfile('.claude/skills/test-helper/SKILL.md', '# skill');
		mkfile('.claude/skills/test-helper/scripts/run.sh', '#!/bin/bash');
		mkfile('.claude/hooks/pre-commit.sh', '#!/bin/bash');
		// decoys
		mkfile('.claude/commands/script.sh', '#!/bin/bash');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'CLAUDE.md', tool: 'claude-code', componentType: 'instruction' },
			{ path: '.claude/CLAUDE.md', tool: 'claude-code', componentType: 'instruction' },
			{
				path: '.claude/rules/frontend/react.md',
				tool: 'claude-code',
				componentType: 'instruction'
			},
			{ path: '.claude/agents/reviewer.md', tool: 'claude-code', componentType: 'instruction' },
			{ path: '.claude/commands/review.md', tool: 'claude-code', componentType: 'command' },
			{ path: '.claude/commands/sub/helper.md', tool: 'claude-code', componentType: 'command' },
			{ path: '.claude/skills/test-helper/SKILL.md', tool: 'claude-code', componentType: 'skill' },
			{
				path: '.claude/skills/test-helper/scripts/run.sh',
				tool: 'claude-code',
				componentType: 'skill'
			},
			{ path: '.claude/hooks/pre-commit.sh', tool: 'claude-code', componentType: 'hook' }
		]);
		expect(find(files, '.claude/commands/script.sh')).toBeUndefined();
	});

	it('never detects Settings files or personal files whole', () => {
		mkfile('.claude/settings.json', '{}');
		mkfile('.claude/settings.local.json', '{}');
		mkfile('CLAUDE.local.md', '# mine');
		mkfile('.mcp.json', '{}');
		expect(detectFiles(tmpDir)).toEqual([]);
	});
});

describe('detectFiles — codex', () => {
	it('detects all known codex paths', () => {
		mkfile('AGENTS.override.md', '# override');
		mkfile('.codex/agents/my-agent.toml', '');
		mkfile('.codex/config.toml', '');
		mkfile('.codex/hooks.json', '{}');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'AGENTS.override.md', tool: 'codex', componentType: 'instruction' },
			{ path: '.codex/agents/my-agent.toml', tool: 'codex', componentType: 'instruction' }
		]);
		expect(find(files, '.codex/config.toml')).toBeUndefined();
		expect(find(files, '.codex/hooks.json')).toBeUndefined();
	});
});

describe('detectFiles — shared paths', () => {
	it('tags .agents/skills/** and AGENTS.md as shared (tool=null)', () => {
		mkfile('AGENTS.md', '# agents');
		mkfile('.agents/skills/api-patterns/SKILL.md', '# api-patterns');
		mkfile('.agents/skills/api-patterns/scripts/check.sh', '#!/bin/bash');
		mkfile('.agents/skills/deep/nested/helper.md', '# nested');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: 'AGENTS.md', tool: null, componentType: 'instruction' },
			{ path: '.agents/skills/api-patterns/SKILL.md', tool: null, componentType: 'skill' },
			{ path: '.agents/skills/api-patterns/scripts/check.sh', tool: null, componentType: 'skill' },
			{ path: '.agents/skills/deep/nested/helper.md', tool: null, componentType: 'skill' }
		]);
		expect(files.every((f) => f.tool === null)).toBe(true);
	});
});

describe('detectFiles — copilot', () => {
	it('detects all known copilot paths and ignores arbitrary .github files', () => {
		mkfile('.github/copilot-instructions.md', '# copilot');
		mkfile('.github/instructions/react.instructions.md', '# react');
		mkfile('.github/agents/reviewer.agent.md', '# agent');
		mkfile('.github/prompts/review.prompt.md', '# prompt');
		mkfile('.github/hooks/lint.json', '{}');
		mkfile('.github/skills/x/SKILL.md', '# skill');
		mkfile('.github/workflows/copilot-setup-steps.yml', '');
		// decoys, including the dropped .github/copilot/* and .vscode/settings.json paths
		mkfile('.github/workflows/ci.yml', '');
		mkfile('.github/PULL_REQUEST_TEMPLATE.md', '');
		mkfile('.github/copilot/mcp.json', '{}');
		mkfile('.vscode/settings.json', '{}');
		mkfile('.vscode/mcp.json', '{}');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.github/copilot-instructions.md', tool: 'copilot', componentType: 'instruction' },
			{
				path: '.github/instructions/react.instructions.md',
				tool: 'copilot',
				componentType: 'instruction'
			},
			{ path: '.github/agents/reviewer.agent.md', tool: 'copilot', componentType: 'instruction' },
			{ path: '.github/prompts/review.prompt.md', tool: 'copilot', componentType: 'command' },
			{ path: '.github/hooks/lint.json', tool: 'copilot', componentType: 'hook' },
			{ path: '.github/skills/x/SKILL.md', tool: 'copilot', componentType: 'skill' },
			{
				path: '.github/workflows/copilot-setup-steps.yml',
				tool: 'copilot',
				componentType: 'setup_script'
			}
		]);
		for (const p of [
			'.github/workflows/ci.yml',
			'.github/PULL_REQUEST_TEMPLATE.md',
			'.github/copilot/mcp.json',
			'.vscode/settings.json',
			'.vscode/mcp.json'
		]) {
			expect(find(files, p), p).toBeUndefined();
		}
	});
});

describe('detectFiles — cursor', () => {
	it('detects all known cursor paths', () => {
		mkfile('.cursorrules', 'always write tests');
		mkfile('.cursorignore', 'node_modules/');
		mkfile('.cursor/rules/my-rule.mdc', '# rule');
		mkfile('.cursor/agents/reviewer.md', '# agent');
		mkfile('.cursor/commands/refactor.md', '# refactor');
		mkfile('.cursor/skills/my-skill/SKILL.md', '# skill');
		// dropped or Settings files
		mkfile('.cursorindexingignore', '*.log');
		mkfile('.cursor/rules/coding-style.md', '# style');
		mkfile('.cursor/mcp.json', '{}');
		mkfile('.cursor/hooks.json', '{}');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.cursorrules', tool: 'cursor', componentType: 'instruction' },
			{ path: '.cursorignore', tool: 'cursor', componentType: 'instruction' },
			{ path: '.cursor/rules/my-rule.mdc', tool: 'cursor', componentType: 'instruction' },
			{ path: '.cursor/agents/reviewer.md', tool: 'cursor', componentType: 'instruction' },
			{ path: '.cursor/commands/refactor.md', tool: 'cursor', componentType: 'command' },
			{ path: '.cursor/skills/my-skill/SKILL.md', tool: 'cursor', componentType: 'skill' }
		]);
		for (const p of [
			'.cursorindexingignore',
			'.cursor/rules/coding-style.md',
			'.cursor/mcp.json',
			'.cursor/hooks.json'
		]) {
			expect(find(files, p), p).toBeUndefined();
		}
	});
});

describe('detectFiles — gemini', () => {
	it('detects all known gemini paths', () => {
		mkfile('.geminiignore', '*.log');
		mkfile('.gemini/commands/build.toml', '');
		mkfile('.gemini/skills/analyze/SKILL.md', '');
		mkfile('.gemini/policies/security.toml', '');
		mkfile('.gemini/settings.json', '{}');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.geminiignore', tool: 'gemini', componentType: 'instruction' },
			{ path: '.gemini/commands/build.toml', tool: 'gemini', componentType: 'command' },
			{ path: '.gemini/skills/analyze/SKILL.md', tool: 'gemini', componentType: 'skill' },
			{ path: '.gemini/policies/security.toml', tool: 'gemini', componentType: 'instruction' }
		]);
		expect(find(files, '.gemini/settings.json')).toBeUndefined();
	});

	it('detects GEMINI.md for both gemini and antigravity', () => {
		mkfile('GEMINI.md', '# gemini');
		const tools = findAll(detectFiles(tmpDir), 'GEMINI.md').map((f) => f.tool);
		expect(tools).toEqual(['gemini', 'antigravity']);
	});
});

describe('detectFiles — opencode', () => {
	it('detects all known opencode paths', () => {
		mkfile('.opencode/commands/deploy.md', '# deploy');
		mkfile('.opencode/agents/reviewer.md', '# agent');
		mkfile('.opencode/skills/x/SKILL.md', '# skill');
		mkfile('.opencode/plugins/notify.ts', '');
		// stale names from the archived Go project, and the Settings file
		mkfile('opencode.md', '# opencode');
		mkfile('.opencode.json', '{}');
		mkfile('opencode.json', '{}');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.opencode/commands/deploy.md', tool: 'opencode', componentType: 'command' },
			{ path: '.opencode/agents/reviewer.md', tool: 'opencode', componentType: 'instruction' },
			{ path: '.opencode/skills/x/SKILL.md', tool: 'opencode', componentType: 'skill' },
			{ path: '.opencode/plugins/notify.ts', tool: 'opencode', componentType: 'hook' }
		]);
		for (const p of ['opencode.md', '.opencode.json', 'opencode.json']) {
			expect(find(files, p), p).toBeUndefined();
		}
	});
});

describe('detectFiles — antigravity', () => {
	it('detects all known antigravity workspace paths', () => {
		mkfile('.agents/AGENTS.md', '# agents');
		mkfile('.agents/GEMINI.md', '# gemini');
		mkfile('.agents/rules/style.md', '---\ntrigger: always_on\n---');
		mkfile('.agents/agents/reviewer/agent.md', '# agent');
		mkfile('.agents/rules.json', '{}');
		mkfile('.agents/agents.json', '{}');
		mkfile('.agents/skills.json', '{}');
		mkfile('.agents/plugins/lint/plugin.json', '{}');
		// Settings files, and the sunset workflows dir
		mkfile('.agents/mcp_config.json', '{}');
		mkfile('.agents/hooks.json', '{}');
		mkfile('.agents/workflows/deploy.md', '# deploy');

		const files = detectFiles(tmpDir);
		assertDetected(files, [
			{ path: '.agents/AGENTS.md', tool: 'antigravity', componentType: 'instruction' },
			{ path: '.agents/GEMINI.md', tool: 'antigravity', componentType: 'instruction' },
			{ path: '.agents/rules/style.md', tool: 'antigravity', componentType: 'instruction' },
			{
				path: '.agents/agents/reviewer/agent.md',
				tool: 'antigravity',
				componentType: 'instruction'
			},
			{ path: '.agents/rules.json', tool: 'antigravity', componentType: 'config' },
			{ path: '.agents/agents.json', tool: 'antigravity', componentType: 'config' },
			{ path: '.agents/skills.json', tool: 'antigravity', componentType: 'config' },
			{ path: '.agents/plugins/lint/plugin.json', tool: 'antigravity', componentType: 'hook' }
		]);
		for (const p of [
			'.agents/mcp_config.json',
			'.agents/hooks.json',
			'.agents/workflows/deploy.md'
		]) {
			expect(find(files, p), p).toBeUndefined();
		}
	});
});

// ─── Multi-agent invariants ──────────────────────────────────────────────────

describe('detectFiles — multi-agent projects', () => {
	it('detects files from all seven agents and excludes unrelated files in the same project', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('AGENTS.override.md', '# codex');
		mkfile('.github/copilot-instructions.md', '# copilot');
		mkfile('.cursorrules', 'rules');
		mkfile('GEMINI.md', '# gemini');
		mkfile('.opencode/commands/review.md', '# opencode');
		mkfile('.agents/rules/style.md', '# antigravity');
		mkfile('README.md', '# readme');
		mkfile('src/index.ts', '');

		const files = detectFiles(tmpDir);
		const agents = new Set(files.map((f) => f.tool));
		for (const a of [
			'claude-code',
			'codex',
			'copilot',
			'cursor',
			'gemini',
			'opencode',
			'antigravity'
		]) {
			expect(agents).toContain(a);
		}
		expect(find(files, 'README.md')).toBeUndefined();
		expect(find(files, 'src/index.ts')).toBeUndefined();
	});

	it('produces at most one entry per (path, agent) pair and allows same path under different agents', () => {
		// .claude/CLAUDE.md matches both claude-code's project and global globs
		mkfile('.claude/CLAUDE.md', '# claude');
		mkfile('.claude/skills/my-skill/SKILL.md', '# skill');
		mkfile('.cursor/skills/my-skill/SKILL.md', '# skill');
		const files = detectFiles(tmpDir);

		expect(
			files.filter((f) => f.path === '.claude/CLAUDE.md' && f.tool === 'claude-code')
		).toHaveLength(1);
		expect(find(files, '.claude/skills/my-skill/SKILL.md')?.tool).toBe('claude-code');
		expect(find(files, '.cursor/skills/my-skill/SKILL.md')?.tool).toBe('cursor');
	});

	it('does not duplicate root-level agent files (CLAUDE.md, AGENTS.md, etc.)', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('AGENTS.md', '# agents');
		mkfile('.cursorrules', 'rules');
		const files = detectFiles(tmpDir);

		for (const p of ['CLAUDE.md', 'AGENTS.md', '.cursorrules']) {
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
