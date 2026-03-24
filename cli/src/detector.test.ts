import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectFiles, type DetectedFile } from './detector.js';

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magpie-detector-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function mkfile(relPath: string, content = ''): void {
	const full = path.join(tmpDir, relPath);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, content, 'utf-8');
}

function find(files: DetectedFile[], source: string): DetectedFile | undefined {
	return files.find((f) => f.source === source);
}

describe('detectFiles — empty directory', () => {
	it('returns an empty array when no known files are present', () => {
		expect(detectFiles(tmpDir)).toEqual([]);
	});

	it('ignores unknown files', () => {
		mkfile('README.md');
		mkfile('src/index.ts');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});
});

describe('detectFiles — Claude Code', () => {
	it('detects .claude/settings.json as global instruction', () => {
		mkfile('.claude/settings.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/settings.json');
		expect(f).toBeDefined();
		expect(f!.target).toBe('~/.claude/settings.json');
		expect(f!.placement).toBe('global');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/CLAUDE.md as global instruction', () => {
		mkfile('.claude/CLAUDE.md', '# instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/CLAUDE.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('~/.claude/CLAUDE.md');
		expect(f!.placement).toBe('global');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects root CLAUDE.md as project instruction', () => {
		mkfile('CLAUDE.md', '# project instructions');
		const files = detectFiles(tmpDir);
		const f = find(files, 'CLAUDE.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('CLAUDE.md');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects .claude/commands/*.md as global commands', () => {
		mkfile('.claude/commands/review.md', '# review command');
		mkfile('.claude/commands/deploy.md', '# deploy command');
		const files = detectFiles(tmpDir);

		const review = find(files, '.claude/commands/review.md');
		expect(review).toBeDefined();
		expect(review!.target).toBe('~/.claude/commands/review.md');
		expect(review!.placement).toBe('global');
		expect(review!.componentType).toBe('command');
		expect(review!.tool).toBe('claude-code');

		const deploy = find(files, '.claude/commands/deploy.md');
		expect(deploy).toBeDefined();
		expect(deploy!.target).toBe('~/.claude/commands/deploy.md');
	});

	it('detects nested commands preserving subdirectory', () => {
		mkfile('.claude/commands/sub/helper.md', '# helper');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/commands/sub/helper.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('~/.claude/commands/sub/helper.md');
		expect(f!.componentType).toBe('command');
	});

	it('does not detect non-.md files in .claude/commands/', () => {
		mkfile('.claude/commands/script.sh', '#!/bin/bash');
		expect(detectFiles(tmpDir)).toHaveLength(0);
	});

	it('detects .claude/skills/*.md as global skills', () => {
		mkfile('.claude/skills/test-helper.md', '# skill');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/skills/test-helper.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('~/.claude/skills/test-helper.md');
		expect(f!.placement).toBe('global');
		expect(f!.componentType).toBe('skill');
		expect(f!.tool).toBe('claude-code');
	});

	it('detects .claude/hooks/ files as global hooks', () => {
		mkfile('.claude/hooks/pre-commit.sh', '#!/bin/bash');
		const files = detectFiles(tmpDir);
		const f = find(files, '.claude/hooks/pre-commit.sh');
		expect(f).toBeDefined();
		expect(f!.target).toBe('~/.claude/hooks/pre-commit.sh');
		expect(f!.placement).toBe('global');
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
});

describe('detectFiles — Cursor', () => {
	it('detects .cursor/rules/*.mdc as project instructions', () => {
		mkfile('.cursor/rules/my-rule.mdc', '# rule');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/rules/my-rule.mdc');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.cursor/rules/my-rule.mdc');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('cursor');
	});

	it('detects .cursor/rules/*.md as project instructions', () => {
		mkfile('.cursor/rules/coding-style.md', '# style');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursor/rules/coding-style.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.cursor/rules/coding-style.md');
		expect(f!.componentType).toBe('instruction');
	});

	it('detects .cursorrules as legacy project instruction', () => {
		mkfile('.cursorrules', 'always write tests');
		const files = detectFiles(tmpDir);
		const f = find(files, '.cursorrules');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.cursorrules');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('cursor');
	});
});

describe('detectFiles — MCP', () => {
	it('detects .mcp.json as project mcp_server', () => {
		mkfile('.mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, '.mcp.json');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.mcp.json');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('mcp_server');
		expect(f!.tool).toBe('mcp');
	});

	it('detects mcp.json as project mcp_server', () => {
		mkfile('mcp.json', '{}');
		const files = detectFiles(tmpDir);
		const f = find(files, 'mcp.json');
		expect(f).toBeDefined();
		expect(f!.target).toBe('mcp.json');
		expect(f!.componentType).toBe('mcp_server');
	});
});

describe('detectFiles — GitHub Copilot', () => {
	it('detects .github/copilot-instructions.md as project instruction', () => {
		mkfile('.github/copilot-instructions.md', '# copilot');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot-instructions.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.github/copilot-instructions.md');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('github-copilot');
	});

	it('detects .github/copilot/*.md as project instructions', () => {
		mkfile('.github/copilot/custom.md', '# custom');
		const files = detectFiles(tmpDir);
		const f = find(files, '.github/copilot/custom.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('.github/copilot/custom.md');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('github-copilot');
	});
});

describe('detectFiles — OpenAI Agents', () => {
	it('detects AGENTS.md as project instruction', () => {
		mkfile('AGENTS.md', '# agents');
		const files = detectFiles(tmpDir);
		const f = find(files, 'AGENTS.md');
		expect(f).toBeDefined();
		expect(f!.target).toBe('AGENTS.md');
		expect(f!.placement).toBe('project');
		expect(f!.componentType).toBe('instruction');
		expect(f!.tool).toBe('openai-agents');
	});
});

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
});

describe('detectFiles — mixed files', () => {
	it('detects multiple files from different tools', () => {
		mkfile('CLAUDE.md', '# claude');
		mkfile('.claude/commands/review.md', '# review');
		mkfile('.cursorrules', 'rules');
		mkfile('.mcp.json', '{}');
		mkfile('.github/copilot-instructions.md', '# copilot');
		mkfile('README.md', '# readme'); // should not be detected
		mkfile('src/index.ts', ''); // should not be detected

		const files = detectFiles(tmpDir);
		expect(files).toHaveLength(5);

		const tools = files.map((f) => f.tool);
		expect(tools).toContain('claude-code');
		expect(tools).toContain('cursor');
		expect(tools).toContain('mcp');
		expect(tools).toContain('github-copilot');
	});

	it('each file matches only the first applicable pattern', () => {
		// .claude/settings.json should not also be a command even if somehow named weirdly
		mkfile('.claude/settings.json', '{}');
		const files = detectFiles(tmpDir);
		expect(files).toHaveLength(1);
	});
});
