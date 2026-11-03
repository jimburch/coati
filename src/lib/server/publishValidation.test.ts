import { describe, it, expect } from 'vitest';
import {
	PublishError,
	resolveClassification,
	validatePublishFiles,
	validatePublishPath
} from './publishValidation';

function codeOf(fn: () => unknown): string | undefined {
	try {
		fn();
	} catch (err) {
		if (err instanceof PublishError) return err.code;
		throw err;
	}
	return undefined;
}

describe('validatePublishPath', () => {
	it.each([
		['CLAUDE.md', 'x'],
		['~/.claude/skills/review/SKILL.md', 'x'],
		['.mcp.json#mcpServers.github', '{"command":"npx"}'],
		['.claude/settings.json#permissions.allow[="Bash(npm test)"]', '"Bash(npm test)"'],
		['docs/anything.txt', 'x']
	])('accepts %s', (path, content) => {
		expect(codeOf(() => validatePublishPath(path, content))).toBeUndefined();
	});

	it.each([
		['../escape.md', 'INVALID_PATH'],
		['/etc/passwd', 'INVALID_PATH'],
		['notes~', 'INVALID_PATH'],
		['sub/.git/config', 'INVALID_PATH'],
		['~/.bashrc', 'INVALID_PATH'],
		['~/.ssh/authorized_keys', 'INVALID_PATH'],
		['.claude/settings.json', 'SETTINGS_FILE_WHOLE'],
		['~/.claude/settings.json', 'SETTINGS_FILE_WHOLE'],
		['.mcp.json', 'SETTINGS_FILE_WHOLE'],
		['.claude/settings.json#apiKeyHelper', 'INVALID_SELECTOR'],
		['.claude/settings.json#authToken', 'INVALID_SELECTOR'],
		['.claude/settings.local.json', 'INVALID_SELECTOR'],
		['~/.claude.json', 'INVALID_SELECTOR'],
		['CLAUDE.md#foo', 'INVALID_SELECTOR'],
		['.claude/settings.json#[bad', 'INVALID_PATH']
	])('rejects %s with %s', (path, code) => {
		expect(codeOf(() => validatePublishPath(path, '{}'))).toBe(code);
	});

	it('rejects fragment content that is not JSON', () => {
		expect(codeOf(() => validatePublishPath('.mcp.json#mcpServers.github', 'nope'))).toBe(
			'VALIDATION_ERROR'
		);
	});

	it('names the path in the message', () => {
		expect(() => validatePublishPath('~/.bashrc', 'x')).toThrow('~/.bashrc');
	});
});

describe('validatePublishFiles', () => {
	it('rejects duplicate paths', () => {
		const file = { path: 'CLAUDE.md', content: 'x' };
		expect(codeOf(() => validatePublishFiles([file, file]))).toBe('VALIDATION_ERROR');
	});
});

describe('resolveClassification', () => {
	it('detects the Agent and type when the client sends none', () => {
		expect(resolveClassification({ path: 'CLAUDE.md', content: 'x' })).toEqual({
			agent: 'claude-code',
			componentType: 'instruction',
			description: null
		});
	});

	it('leaves a shared path with no Agent when none is sent', () => {
		expect(resolveClassification({ path: 'AGENTS.md', content: 'x' }).agent).toBeNull();
	});

	it('accepts an allowed Agent on a multi-Agent path, or none', () => {
		expect(resolveClassification({ path: 'AGENTS.md', content: 'x', agent: 'codex' }).agent).toBe(
			'codex'
		);
		expect(resolveClassification({ path: 'AGENTS.md', content: 'x', agent: null }).agent).toBe(
			null
		);
	});

	it('rejects an Agent outside allowedAgentsFor, and none on a locked path', () => {
		expect(
			codeOf(() => resolveClassification({ path: 'CLAUDE.md', content: 'x', agent: 'cursor' }))
		).toBe('INVALID_CLASSIFICATION');
		expect(
			codeOf(() => resolveClassification({ path: 'CLAUDE.md', content: 'x', agent: null }))
		).toBe('INVALID_CLASSIFICATION');
		expect(
			codeOf(() => resolveClassification({ path: 'misc.txt', content: 'x', agent: 'codex' }))
		).toBe('INVALID_CLASSIFICATION');
	});

	it("locks a fragment's type to its selector's", () => {
		const path = '.mcp.json#mcpServers.github';
		expect(resolveClassification({ path, content: '{}' }).componentType).toBe('mcp_server');
		expect(
			codeOf(() => resolveClassification({ path, content: '{}', componentType: 'config' }))
		).toBe('INVALID_CLASSIFICATION');
	});

	it("lets a fragment take one of its host file's readers", () => {
		expect(
			resolveClassification({
				path: '.mcp.json#mcpServers.github',
				content: '{}',
				agent: 'copilot'
			}).agent
		).toBe('copilot');
	});

	it('lets a whole file take any type', () => {
		expect(
			resolveClassification({ path: 'CLAUDE.md', content: 'x', componentType: 'config' })
				.componentType
		).toBe('config');
	});
});
