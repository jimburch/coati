import { describe, it, expect } from 'vitest';
import { canonicalJson, hashFile, hashFragment, hashSetupFile } from './index.js';

describe('canonicalJson', () => {
	it('writes RFC 8785 form: sorted keys, no whitespace', () => {
		expect(canonicalJson({ b: [1, { d: true, c: null }], a: 'x' })).toBe(
			'{"a":"x","b":[1,{"c":null,"d":true}]}'
		);
	});

	it('uses ECMAScript number serialization', () => {
		expect(canonicalJson({ n: 1.0, e: 1e21, f: 0.1 })).toBe('{"e":1e+21,"f":0.1,"n":1}');
	});

	it('throws on a value JSON cannot represent', () => {
		expect(() => canonicalJson(undefined)).toThrow();
	});
});

describe('hashFragment', () => {
	const server = {
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-github'],
		env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' }
	};

	it('hashes reordered keys and reformatted JSON the same', async () => {
		const reordered = JSON.parse(`{
			"env":   { "GITHUB_TOKEN": "\${GITHUB_TOKEN}" },
			"args": ["-y", "@modelcontextprotocol/server-github"],
			"command": "npx"
		}`);
		const sent = JSON.parse(JSON.stringify(server, null, 2));
		expect(await hashFragment(reordered)).toBe(await hashFragment(server));
		expect(await hashFragment(sent)).toBe(await hashFragment(server));
	});

	it('hashes a changed value differently', async () => {
		expect(await hashFragment({ ...server, command: 'node' })).not.toBe(await hashFragment(server));
	});

	it('treats array order as significant', async () => {
		expect(await hashFragment(['a', 'b'])).not.toBe(await hashFragment(['b', 'a']));
	});
});

describe('hashSetupFile', () => {
	it('hashes a whole-file path with hashFile', async () => {
		const content = '# Rules\r\nBe brief.\r\n';
		expect(await hashSetupFile('CLAUDE.md', content)).toBe(await hashFile(content));
		expect(await hashSetupFile('~/.claude/CLAUDE.md', content)).toBe(await hashFile(content));
	});

	it('hashes a fragment path as the canonical JSON of its content', async () => {
		const value = { command: 'npx', args: ['-y', 'server-github'] };
		const sent = JSON.stringify(value, null, 2);
		const compact = '{"args":["-y","server-github"],"command":"npx"}';
		expect(await hashSetupFile('.mcp.json#mcpServers.github', sent)).toBe(
			await hashFragment(value)
		);
		expect(await hashSetupFile('.mcp.json#mcpServers.github', compact)).toBe(
			await hashSetupFile('.mcp.json#mcpServers.github', sent)
		);
	});

	it('hashes a scalar fragment', async () => {
		expect(
			await hashSetupFile('.claude/settings.json#permissions.allow[=WebSearch]', '"WebSearch"')
		).toBe(await hashFragment('WebSearch'));
	});

	it('rejects fragment content that is not JSON', async () => {
		await expect(hashSetupFile('.mcp.json#mcpServers.github', '{nope')).rejects.toThrow();
	});

	it('rejects an invalid Setup path rather than guessing', async () => {
		await expect(hashSetupFile('../x.md', 'x')).rejects.toThrow();
		await expect(hashSetupFile('.mcp.json#a#b', '{}')).rejects.toThrow();
	});
});
