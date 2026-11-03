import { describe, it, expect } from 'vitest';
import { parseSelector, formatSelector, getAtSelector, selectorMatchesPattern } from './index.js';
import type { Selector } from './index.js';

function sel(text: string): Selector {
	const parsed = parseSelector(text);
	if (!parsed) throw new Error(`bad selector in test: ${text}`);
	return parsed;
}

describe('parseSelector', () => {
	it('parses dot-separated object keys', () => {
		expect(parseSelector('mcpServers.github')).toEqual([
			{ kind: 'key', key: 'mcpServers' },
			{ kind: 'key', key: 'github' }
		]);
	});

	it('parses [field=value] array-element filters attached to a key', () => {
		expect(parseSelector('hooks.PreToolUse[matcher=Bash].hooks[command=lint]')).toEqual([
			{ kind: 'key', key: 'hooks' },
			{ kind: 'key', key: 'PreToolUse' },
			{ kind: 'match', field: 'matcher', value: 'Bash' },
			{ kind: 'key', key: 'hooks' },
			{ kind: 'match', field: 'command', value: 'lint' }
		]);
	});

	it('parses [=value] scalar-element filters', () => {
		expect(parseSelector('permissions.allow[=WebSearch]')).toEqual([
			{ kind: 'key', key: 'permissions' },
			{ kind: 'key', key: 'allow' },
			{ kind: 'value', value: 'WebSearch' }
		]);
	});

	it('reads JSON-string quoted keys and values', () => {
		expect(parseSelector('permissions.allow[="Bash(npm test)"]')).toEqual([
			{ kind: 'key', key: 'permissions' },
			{ kind: 'key', key: 'allow' },
			{ kind: 'value', value: 'Bash(npm test)' }
		]);
		expect(parseSelector('env."a.b"')).toEqual([
			{ kind: 'key', key: 'env' },
			{ kind: 'key', key: 'a.b' }
		]);
		expect(
			parseSelector('hooks.PreToolUse[matcher=""].hooks[command="$HOME/.claude/hooks/lint.sh"]')
		).toEqual([
			{ kind: 'key', key: 'hooks' },
			{ kind: 'key', key: 'PreToolUse' },
			{ kind: 'match', field: 'matcher', value: '' },
			{ kind: 'key', key: 'hooks' },
			{ kind: 'match', field: 'command', value: '$HOME/.claude/hooks/lint.sh' }
		]);
	});
});

// One concrete selector for every offered pattern in spec §4.
const SPEC_SELECTORS = [
	// claude-code .claude/settings.json
	'hooks.PreToolUse[matcher=Bash].hooks[command="$HOME/.claude/hooks/lint.sh"]',
	'hooks.Stop[matcher=""].hooks[command="${CLAUDE_PROJECT_DIR}/.claude/hooks/notify.sh"]',
	'permissions.allow[="Bash(npm test)"]',
	'permissions.allow[=WebSearch]',
	'permissions.ask[="Bash(git push:*)"]',
	'permissions.deny[="Read(./.env)"]',
	'env.NODE_ENV',
	'model',
	// .mcp.json, cursor, gemini, copilot global, antigravity mcp_config.json
	'mcpServers.github',
	// codex config.toml
	'mcp_servers.github',
	// copilot .vscode/mcp.json
	'servers.github',
	// opencode
	'mcp.github',
	// cursor hooks.json
	'hooks.afterFileEdit[command="./hooks/format.sh"]',
	// gemini settings.json hooks
	'hooks.BeforeTool[matcher=write_file].hooks[command="$GEMINI_PROJECT_DIR/hooks/check.sh"]',
	// antigravity hooks.json
	'formatOnSave'
];

describe('parseSelector rejects', () => {
	it.each([
		['empty', ''],
		['a leading dot', '.a'],
		['a trailing dot', 'a.'],
		['an empty key', 'a..b'],
		['a filter with no key before it', '[=x]'],
		['an unclosed filter', 'a[x=y'],
		['a filter with no =', 'a[x]'],
		['a key right after a filter', 'a[x=y]b'],
		['a stray ]', 'a]'],
		['a bare #', 'a#b'],
		['bare whitespace', 'a b'],
		['an unterminated string', 'a."b'],
		['an invalid JSON escape', 'a."\\q"']
	])('%s (%s)', (_label, text) => {
		expect(parseSelector(text)).toBeNull();
	});

	// One spelling per selector, so a fragment has exactly one Setup path.
	it.each([
		['needless quotes on a key', '"mcpServers".github'],
		['needless quotes on a value', 'permissions.allow[="WebSearch"]'],
		['an escape that JSON.stringify would not write', 'env."\\u0061.b"']
	])('non-canonical spelling: %s (%s)', (_label, text) => {
		expect(parseSelector(text)).toBeNull();
	});
});

describe('formatSelector', () => {
	it('writes bare tokens where possible and JSON strings where needed', () => {
		expect(
			formatSelector([
				{ kind: 'key', key: 'permissions' },
				{ kind: 'key', key: 'allow' },
				{ kind: 'value', value: 'Bash(npm test)' }
			])
		).toBe('permissions.allow[="Bash(npm test)"]');
		expect(
			formatSelector([
				{ kind: 'key', key: 'hooks' },
				{ kind: 'key', key: 'Stop' },
				{ kind: 'match', field: 'matcher', value: '' }
			])
		).toBe('hooks.Stop[matcher=""]');
	});

	it.each(['.', '[', ']', '=', '#', '"', ' ', '\t', '\n'])('quotes a token containing %j', (ch) => {
		const key = `a${ch}b`;
		expect(formatSelector([{ kind: 'key', key }])).toBe(JSON.stringify(key));
	});

	it.each(SPEC_SELECTORS)('round-trips %s', (text) => {
		const parsed = parseSelector(text);
		expect(parsed).not.toBeNull();
		expect(formatSelector(parsed!)).toBe(text);
	});
});

describe('getAtSelector', () => {
	const lint = { type: 'command', command: '$HOME/.claude/hooks/lint.sh', timeout: 30 };
	const notify = { type: 'command', command: 'notify-send done' };
	const settings = {
		permissions: { allow: ['WebSearch', 'Bash(npm test)'], deny: [] },
		env: { NODE_ENV: 'development' },
		hooks: {
			PreToolUse: [
				{ matcher: 'Edit', hooks: [{ type: 'command', command: 'prettier' }] },
				{ matcher: 'Bash', hooks: [notify, lint] }
			],
			Stop: [{ hooks: [notify] }]
		},
		mcpServers: { github: { command: 'npx' } }
	};

	it('follows object keys', () => {
		expect(getAtSelector(settings, sel('mcpServers.github'))).toEqual({ command: 'npx' });
		expect(getAtSelector(settings, sel('env.NODE_ENV'))).toBe('development');
	});

	it('picks array elements by field to reach a hook handler', () => {
		expect(
			getAtSelector(
				settings,
				sel('hooks.PreToolUse[matcher=Bash].hooks[command="$HOME/.claude/hooks/lint.sh"]')
			)
		).toEqual(lint);
	});

	it('treats a missing field as ""', () => {
		expect(
			getAtSelector(settings, sel('hooks.Stop[matcher=""].hooks[command="notify-send done"]'))
		).toEqual(notify);
	});

	it('picks a scalar array element by value', () => {
		expect(getAtSelector(settings, sel('permissions.allow[="Bash(npm test)"]'))).toBe(
			'Bash(npm test)'
		);
	});

	it.each([
		['a missing key', 'mcpServers.linear'],
		['a key on an array', 'permissions.allow.length'],
		['a filter on an object', 'env[=development]'],
		['no matching element', 'hooks.PreToolUse[matcher=Write]'],
		['no matching scalar', 'permissions.deny[=WebSearch]'],
		['a key past a scalar', 'env.NODE_ENV.x'],
		['an inherited property', 'toString'],
		['__proto__', '__proto__']
	])('returns undefined for %s', (_label, text) => {
		expect(getAtSelector(settings, sel(text))).toBeUndefined();
	});
});

describe('selectorMatchesPattern', () => {
	it.each([
		[
			'hooks.PreToolUse[matcher=Bash].hooks[command="$HOME/.claude/hooks/lint.sh"]',
			'hooks.<Event>[matcher=<m>].hooks[command=<cmd>]'
		],
		[
			'hooks.Stop[matcher=""].hooks[command=notify]',
			'hooks.<Event>[matcher=<m>].hooks[command=<cmd>]'
		],
		['permissions.allow[="Bash(npm test)"]', 'permissions.allow[=<rule>]'],
		['permissions.ask[=WebFetch]', 'permissions.ask[=<rule>]'],
		['permissions.deny[="Read(./.env)"]', 'permissions.deny[=<rule>]'],
		['env.NODE_ENV', 'env.<NAME>'],
		['mcpServers.github', 'mcpServers.<name>'],
		['mcp_servers.github', 'mcp_servers.<name>'],
		['servers.github', 'servers.<name>'],
		['mcp.github', 'mcp.<name>'],
		['hooks.afterFileEdit[command="./hooks/format.sh"]', 'hooks.<event>[command=<cmd>]'],
		['model', '<key>'],
		['"weird key"', '<key>']
	])('%s matches %s', (text, pattern) => {
		expect(selectorMatchesPattern(sel(text), pattern)).toBe(true);
	});

	it.each([
		['a different literal key', 'permissions.allow[=WebSearch]', 'permissions.deny[=<rule>]'],
		['a longer selector', 'mcpServers.github.command', 'mcpServers.<name>'],
		['a shorter selector', 'mcpServers', 'mcpServers.<name>'],
		['a nested selector against a top-level pattern', 'env.NODE_ENV', '<key>'],
		[
			'a different filter field',
			'hooks.Stop[event=x].hooks[command=y]',
			'hooks.<Event>[matcher=<m>].hooks[command=<cmd>]'
		],
		['a key where a filter is expected', 'permissions.allow.x', 'permissions.allow[=<rule>]'],
		[
			'a field filter where a value filter is expected',
			'permissions.allow[x=y]',
			'permissions.allow[=<rule>]'
		]
	])('rejects %s', (_label, text, pattern) => {
		expect(selectorMatchesPattern(sel(text), pattern)).toBe(false);
	});

	it('throws on a pattern that is not valid selector syntax', () => {
		expect(() => selectorMatchesPattern(sel('a'), 'a[')).toThrow();
	});
});
