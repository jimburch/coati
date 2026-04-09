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

// ─── Empty / false positives ──────────────────────────────────────────────────

describe('detectFiles — empty directory', () => {
	it('returns an empty array when no known files are present', () => {
		expect(detectFiles(tmpDir)).toEqual([]);
	});

	it('ignores unknown files', () => {
		mkfile('README.md');
		mkfile('src/index.ts');
		mkfile('package.json');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('does not detect arbitrary .md files at root', () => {
		mkfile('CONTRIBUTING.md');
		mkfile('CHANGELOG.md');
		mkfile('TODO.md');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('does not detect arbitrary .json files', () => {
		mkfile('config.json');
		mkfile('settings.json');
		mkfile('package.json');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});
});

// ─── Skipped directories ──────────────────────────────────────────────────────

describe('detectFiles — skipped directories', () => {
	it('skips node_modules', () => {
		mkfile('node_modules/.claude/commands/foo.md', '# foo');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('skips .git directory', () => {
		mkfile('.git/CLAUDE.md', '# not a real one');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('skips dist directory', () => {
		mkfile('dist/.mcp.json', '{}');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('skips build directory', () => {
		mkfile('build/CLAUDE.md', '# not real');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('skips .svelte-kit directory', () => {
		mkfile('.svelte-kit/CLAUDE.md', '# not real');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});
});

// ─── Claude Code ─────────────────────────────────────────────────────────────

describe('detectFiles — claude-code', () => {
	it('detects CLAUDE.md as project instruction', () => {
		mkfile('CLAUDE.md', '# project instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, 'CLAUDE.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('CLAUDE.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/settings.json as instruction', () => {
		mkfile('.claude/settings.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/settings.json');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.claude/settings.json');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/CLAUDE.md as instruction', () => {
		mkfile('.claude/CLAUDE.md', '# global instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/CLAUDE.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.claude/CLAUDE.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/commands/*.md as commands', () => {
		mkfile('.claude/commands/review.md', '# review command');
		mkfile('.claude/commands/deploy.md', '# deploy command');
		const files = detectFiles(tmpDir);

		const review = find(files, '.claude/commands/review.md');
		expect(review).toBeDefined();
		expect(review!.path).toBe('.claude/commands/review.md');
		expect(review!.componentType).toBe('command');
		expect(review!.tool).toBe('claude-code');

		const deploy = find(files, '.claude/commands/deploy.md');
		expect(deploy).toBeDefined();
		expect(deploy!.path).toBe('.claude/commands/deploy.md');
	});

	it('detects nested commands preserving subdirectory structure', () => {
		mkfile('.claude/commands/sub/helper.md', '# helper');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/commands/sub/helper.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.claude/commands/sub/helper.md');
		expect(f!.componentType).toBe('command');
	});

	it('does not detect non-.md files in .claude/commands/', () => {
		mkfile('.claude/commands/script.sh', '#!/bin/bash');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('detects .claude/skills/*.md as skills', () => {
		mkfile('.claude/skills/test-helper.md', '# skill');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/skills/test-helper.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.claude/skills/test-helper.md');
		expect(f!.componentType).toBe('skill');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/hooks/ files as hooks', () => {
		mkfile('.claude/hooks/pre-commit.sh', '#!/bin/bash');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/hooks/pre-commit.sh');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.claude/hooks/pre-commit.sh');
		expect(f!.componentType).toBe('hook');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects hooks with any extension', () => {
		mkfile('.claude/hooks/post-tool-use.py', '# hook');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/hooks/post-tool-use.py');
		expect(f).toBeDefined();
		expect(f!.componentType).toBe('hook');
	});

	it('detects .mcp.json as project mcp_server for claude-code', () => {
		mkfile('.mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const matches = findAll(files, '.mcp.json');
		const claudeMatch = matches.find((f) => f.tool === 'claude-code');
		expect(claudeMatch).toBeDefined();
		expect(claudeMatch!.path).toBe('.mcp.json');
		expect(claudeMatch!.componentType).toBe('mcp_server');
	});
});

// ─── Codex ───────────────────────────────────────────────────────────────────

describe('detectFiles — codex', () => {
	it('detects AGENTS.md as project instruction', () => {
		mkfile('AGENTS.md', '# agents');
		const files = detectFiles(tmpDir);
		const f = find(files, 'AGENTS.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('AGENTS.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('codex');
	});

	it('detects .codex/config.toml', () => {
		mkfile('.codex/config.toml', '');
		const files = detectFiles(tmpDir);
		const matches = findAll(files, '.codex/config.toml');
		const match = matches.find((f) => f.tool === 'codex');
		expect(match).toBeDefined();
		expect(match!.path).toBe('.codex/config.toml');
	});

	it('detects .codex/agents/*.toml as project instructions', () => {
		mkfile('.codex/agents/my-agent.toml', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.codex/agents/my-agent.toml');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('codex');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects .agents/skills/*.md as project skills', () => {
		mkfile('.agents/skills/my-skill.md', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.agents/skills/my-skill.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('codex');
		expect(f!.componentType).toBe('skill');
	});
});

// ─── GitHub Copilot ───────────────────────────────────────────────────────────

describe('detectFiles — copilot', () => {
	it('detects .github/copilot-instructions.md as project instruction', () => {
		mkfile('.github/copilot-instructions.md', '# copilot');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot-instructions.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.github/copilot-instructions.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('copilot');
	});

	it('detects .github/copilot/instructions.md as project instruction', () => {
		mkfile('.github/copilot/instructions.md', '# instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/instructions.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects .github/copilot/mcp.json as project mcp_server', () => {
		mkfile('.github/copilot/mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/mcp.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
		expect(f!.componentType).toBe('mcp_server');
	});

	it('detects .github/copilot/agents.json as project instruction', () => {
		mkfile('.github/copilot/agents.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/agents.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
	});

	it('detects .github/copilot/setup.sh as hook', () => {
		mkfile('.github/copilot/setup.sh', '#!/bin/bash');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/setup.sh');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
		expect(f!.componentType).toBe('hook');
	});

	it('detects .github/copilot/prompts/*.md as commands', () => {
		mkfile('.github/copilot/prompts/my-prompt.md', '# prompt');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/prompts/my-prompt.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
		expect(f!.componentType).toBe('command');
	});

	it('detects .vscode/settings.json as copilot instruction', () => {
		mkfile('.vscode/settings.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.vscode/settings.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('copilot');
		expect(f!.componentType).toBe('instruction');
	});

	it('does not detect arbitrary .github files', () => {
		mkfile('.github/workflows/ci.yml', '');
		mkfile('.github/PULL_REQUEST_TEMPLATE.md', '');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});
});

// ─── Cursor ───────────────────────────────────────────────────────────────────

describe('detectFiles — cursor', () => {
	it('detects .cursorrules as legacy project instruction', () => {
		mkfile('.cursorrules', 'always write tests');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursorrules');
		expect(f).toBeDefined();
		expect(f!.path).toBe('.cursorrules');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('cursor');
	});

	it('detects .cursorignore as project instruction', () => {
		mkfile('.cursorignore', 'node_modules/');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursorignore');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
	});

	it('detects .cursorindexingignore as project instruction', () => {
		mkfile('.cursorindexingignore', '*.log');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursorindexingignore');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
	});

	it('detects .cursor/rules/*.mdc', () => {
		mkfile('.cursor/rules/my-rule.mdc', '# rule');
		const files = detectFiles(tmpDir);
		const matches = findAll(files, '.cursor/rules/my-rule.mdc');
		expect(matches.length).toBeGreaterThanOrEqual(1);
		const cursorMatch = matches.find((f) => f.tool === 'cursor');
		expect(cursorMatch).toBeDefined();
		expect(cursorMatch!.componentType).toBe('instruction');
	});

	it('detects .cursor/rules/*.md', () => {
		mkfile('.cursor/rules/coding-style.md', '# style');
		const files = detectFiles(tmpDir);
		const matches = findAll(files, '.cursor/rules/coding-style.md');
		expect(matches.length).toBeGreaterThanOrEqual(1);
		const cursorMatch = matches.find((f) => f.tool === 'cursor');
		expect(cursorMatch).toBeDefined();
		expect(cursorMatch!.componentType).toBe('instruction');
	});

	it('detects .cursor/mcp.json as project mcp_server', () => {
		mkfile('.cursor/mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/mcp.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
		expect(f!.componentType).toBe('mcp_server');
	});

	it('detects .cursor/hooks.json as hook', () => {
		mkfile('.cursor/hooks.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/hooks.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
		expect(f!.componentType).toBe('hook');
	});

	it('detects .cursor/commands/*.md as commands', () => {
		mkfile('.cursor/commands/refactor.md', '# refactor');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/commands/refactor.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
		expect(f!.componentType).toBe('command');
	});

	it('detects .cursor/skills/*.md as skills', () => {
		mkfile('.cursor/skills/my-skill.md', '# skill');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/skills/my-skill.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('cursor');
		expect(f!.componentType).toBe('skill');
	});
});

// ─── Gemini ───────────────────────────────────────────────────────────────────

describe('detectFiles — gemini', () => {
	it('detects GEMINI.md as project instruction', () => {
		mkfile('GEMINI.md', '# gemini instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, 'GEMINI.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('GEMINI.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('gemini');
	});

	it('detects .geminiignore as project instruction', () => {
		mkfile('.geminiignore', '*.log');
		const files = detectFiles(tmpDir);
		const f = find(files, '.geminiignore');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('gemini');
	});

	it('detects .gemini/settings.json', () => {
		mkfile('.gemini/settings.json', '{}');
		const files = detectFiles(tmpDir);
		const matches = findAll(files, '.gemini/settings.json');
		const match = matches.find((f) => f.tool === 'gemini');
		expect(match).toBeDefined();
		expect(match!.path).toBe('.gemini/settings.json');
	});

	it('detects .gemini/commands/*.toml as commands', () => {
		mkfile('.gemini/commands/build.toml', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.gemini/commands/build.toml');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('gemini');
		expect(f!.componentType).toBe('command');
	});

	it('detects .gemini/skills/*.md as skills', () => {
		mkfile('.gemini/skills/analyze.md', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.gemini/skills/analyze.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('gemini');
		expect(f!.componentType).toBe('skill');
	});

	it('detects .gemini/policies/*.toml as instructions', () => {
		mkfile('.gemini/policies/security.toml', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.gemini/policies/security.toml');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('gemini');
		expect(f!.componentType).toBe('instruction');
	});
});

// ─── OpenCode ─────────────────────────────────────────────────────────────────

describe('detectFiles — opencode', () => {
	it('detects opencode.md as project instruction', () => {
		mkfile('opencode.md', '# opencode');
		const files = detectFiles(tmpDir);
		const f = find(files, 'opencode.md');
		expect(f).toBeDefined();
		expect(f!.path).toBe('opencode.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('opencode');
	});

	it('detects .opencode.json as project instruction', () => {
		mkfile('.opencode.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.opencode.json');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('opencode');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects .opencode/commands/*.md as commands', () => {
		mkfile('.opencode/commands/deploy.md', '# deploy');
		const files = detectFiles(tmpDir);
		const f = find(files, '.opencode/commands/deploy.md');
		expect(f).toBeDefined();
		expect(f!.tool).toBe('opencode');
		expect(f!.componentType).toBe('command');
	});
});

// ─── Multi-agent detection ────────────────────────────────────────────────────

describe('detectFiles — multi-agent projects', () => {
	it('detects files from all six agents in a single project', () => {
		// claude-code
		mkfile('CLAUDE.md', '# claude');
		mkfile('.claude/commands/review.md', '# review');
		// codex
		mkfile('AGENTS.md', '# agents');
		// copilot
		mkfile('.github/copilot-instructions.md', '# copilot');
		// cursor
		mkfile('.cursorrules', 'rules');
		// gemini
		mkfile('GEMINI.md', '# gemini');
		// opencode
		mkfile('opencode.md', '# opencode');
		// unrelated files
		mkfile('README.md', '# readme');
		mkfile('src/index.ts', '');

		const files = detectFiles(tmpDir);
		const agents = new Set(files.map((f) => f.tool));
		expect(agents).toContain('claude-code');
		expect(agents).toContain('codex');
		expect(agents).toContain('copilot');
		expect(agents).toContain('cursor');
		expect(agents).toContain('gemini');
		expect(agents).toContain('opencode');
	});

	it('does not include README.md or src/index.ts in a mixed project', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('README.md', '# readme');
		mkfile('src/index.ts', '');
		const files = detectFiles(tmpDir);
		expect(files.find((f) => f.path === 'README.md')).toBeUndefined();
		expect(files.find((f) => f.path === 'src/index.ts')).toBeUndefined();
	});

	it('.mcp.json is tagged as claude-code (not a generic mcp agent)', () => {
		mkfile('.mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const entry = find(files, '.mcp.json');
		expect(entry).toBeDefined();
		expect(entry!.tool).toBe('claude-code');
	});

	it('each (path, agent) pair produces at most one entry', () => {
		mkfile('.claude/settings.json', '{}');
		const files = detectFiles(tmpDir);
		const claudeEntries = files.filter(
			(f) => f.path === '.claude/settings.json' && f.tool === 'claude-code'
		);
		// globalGlobs win; should produce exactly one entry for claude-code
		expect(claudeEntries).toHaveLength(1);
	});

	it('claude-code and cursor each detect their own skill files independently', () => {
		mkfile('.claude/skills/my-skill.md', '# skill');
		mkfile('.cursor/skills/my-skill.md', '# skill');
		const files = detectFiles(tmpDir);
		const claudeSkill = files.find(
			(f) => f.path === '.claude/skills/my-skill.md' && f.tool === 'claude-code'
		);
		const cursorSkill = files.find(
			(f) => f.path === '.cursor/skills/my-skill.md' && f.tool === 'cursor'
		);
		expect(claudeSkill).toBeDefined();
		expect(cursorSkill).toBeDefined();
	});
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('detectFiles — large directory with deep irrelevant trees', () => {
	it('detects all agent configs alongside 50+ level deep irrelevant trees', () => {
		// Agent config files in known locations
		mkfile('CLAUDE.md', '# claude instructions');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('AGENTS.md', '# agents');
		mkfile('.cursor/rules/style.mdc', '# cursor rules');

		// Build a 52-level deep irrelevant directory path
		const levels = 52;
		const deepSegments = Array.from({ length: levels }, (_, i) => `d${i}`);
		const deepPath = `fake-deep/${deepSegments.join('/')}`;

		// Place decoy files deep inside — they should NOT be detected
		mkfile(`${deepPath}/CLAUDE.md`, '# decoy - should not be detected');
		mkfile(`${deepPath}/AGENTS.md`, '# decoy - should not be detected');

		// Another irrelevant tree
		mkfile('Library/Application Support/deep/path/CLAUDE.md', '# decoy');

		const files = detectFiles(tmpDir);

		// All real agent configs are detected
		expect(find(files, 'CLAUDE.md')).toBeDefined();
		expect(find(files, '.claude/commands/review.md')).toBeDefined();
		expect(find(files, 'AGENTS.md')).toBeDefined();

		// Decoy files in irrelevant trees are NOT detected
		const paths = files.map((f) => f.path);
		expect(paths.some((p) => p.startsWith('fake-deep/'))).toBe(false);
		expect(paths.some((p) => p.startsWith('Library/'))).toBe(false);
	});
});

describe('detectFiles — symlink loop', () => {
	it('completes without hanging when a symlink loop exists inside a scan target', () => {
		mkfile('.claude/commands/review.md', '# review');

		// Create a symlink loop: .claude/loop -> .claude (circular reference)
		const claudeDir = path.join(tmpDir, '.claude');
		fs.symlinkSync(claudeDir, path.join(claudeDir, 'loop'));

		// Should complete without hanging or throwing
		let files: DetectedFile[] = [];
		expect(() => {
			files = detectFiles(tmpDir);
		}).not.toThrow();

		// Real file should still be detected
		expect(find(files, '.claude/commands/review.md')).toBeDefined();
	});
});

describe('detectFiles — permission error', () => {
	it.skipIf(process.getuid?.() === 0)(
		'skips unreadable directories and still returns results from accessible ones',
		() => {
			mkfile('CLAUDE.md', '# claude');
			mkfile('.cursor/rules/style.mdc', '# cursor rules');

			// Create a known scan-target directory with no read permissions
			const restrictedDir = path.join(tmpDir, '.gemini');
			fs.mkdirSync(restrictedDir, { recursive: true });
			fs.chmodSync(restrictedDir, 0o000);

			try {
				// Scanner must not throw
				expect(() => detectFiles(tmpDir)).not.toThrow();

				// Files from accessible locations are still returned
				const files = detectFiles(tmpDir);
				expect(find(files, 'CLAUDE.md')).toBeDefined();
				expect(findAll(files, '.cursor/rules/style.mdc').length).toBeGreaterThanOrEqual(1);
			} finally {
				// Restore permissions so afterEach cleanup can delete the directory
				fs.chmodSync(restrictedDir, 0o755);
			}
		}
	);
});

// ─── Description field ────────────────────────────────────────────────────────

describe('detectFiles — description field', () => {
	it('includes a description for detected files', () => {
		mkfile('CLAUDE.md', '');
		const files = detectFiles(tmpDir);
		const f = find(files, 'CLAUDE.md');
		expect(f!.description).toBeTruthy();
		expect(typeof f!.description).toBe('string');
	});

	it('description mentions the agent name for commands', () => {
		mkfile('.claude/commands/review.md', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/commands/review.md');
		expect(f!.description).toMatch(/command/i);
	});

	it('description mentions the agent name for skills', () => {
		mkfile('.claude/skills/helper.md', '');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/skills/helper.md');
		expect(f!.description).toMatch(/skill/i);
	});
});
