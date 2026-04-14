import { describe, it, expect } from 'vitest';
import { renderMarkdown, highlightCode } from './markdown';

describe('renderMarkdown', () => {
	it('renders basic markdown to HTML', async () => {
		const html = await renderMarkdown('# Hello\n\nThis is a paragraph.');
		expect(html).toContain('<h1');
		expect(html).toContain('Hello');
		expect(html).toContain('<p>');
		expect(html).toContain('This is a paragraph.');
	});

	it('renders inline formatting', async () => {
		const html = await renderMarkdown('**bold** and *italic*');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>italic</em>');
	});

	it('syntax-highlights code blocks', async () => {
		const html = await renderMarkdown('```typescript\nconst x: number = 1;\n```');
		expect(html).toContain('shiki');
		expect(html).toContain('const');
	});

	it('renders code blocks with both light and dark theme styles', async () => {
		const html = await renderMarkdown('```typescript\nconst x = 1;\n```');
		expect(html).toContain('github-dark');
		expect(html).toContain('github-light');
	});

	it('falls back gracefully for unknown languages', async () => {
		const html = await renderMarkdown('```unknownlang\nsome code\n```');
		expect(html).toContain('some code');
	});

	it('sanitizes XSS content', async () => {
		const html = await renderMarkdown('<script>alert("xss")</script>');
		expect(html).not.toContain('<script>');
		expect(html).not.toContain('alert');
	});

	it('sanitizes XSS in image onerror', async () => {
		const html = await renderMarkdown('<img src=x onerror=alert(1)>');
		expect(html).not.toContain('onerror');
	});

	it('renders links', async () => {
		const html = await renderMarkdown('[click here](https://example.com)');
		expect(html).toContain('<a');
		expect(html).toContain('https://example.com');
		expect(html).toContain('click here');
	});

	it('renders lists', async () => {
		const html = await renderMarkdown('- item 1\n- item 2');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>');
		expect(html).toContain('item 1');
	});

	it('handles empty content', async () => {
		const html = await renderMarkdown('');
		expect(html).toBe('');
	});
});

describe('highlightCode', () => {
	it('highlights TypeScript files with shiki', async () => {
		const html = await highlightCode('const x: number = 1;', 'main.ts');
		expect(html).toContain('shiki');
		expect(html).toContain('const');
	});

	it('renders highlighted code with both light and dark theme styles', async () => {
		const html = await highlightCode('const x = 1;', 'main.ts');
		expect(html).toContain('github-dark');
		expect(html).toContain('github-light');
	});

	it('highlights JavaScript files', async () => {
		const html = await highlightCode('function foo() {}', 'app.js');
		expect(html).toContain('shiki');
		expect(html).toContain('foo');
	});

	it('highlights JSON files', async () => {
		const html = await highlightCode('{"key": "value"}', 'config.json');
		expect(html).toContain('shiki');
		expect(html).toContain('key');
	});

	it('highlights YAML files', async () => {
		const html = await highlightCode('key: value', 'config.yaml');
		expect(html).toContain('shiki');
	});

	it('highlights .yml extension same as .yaml', async () => {
		const html = await highlightCode('key: value', 'config.yml');
		expect(html).toContain('shiki');
	});

	it('highlights shell scripts', async () => {
		const html = await highlightCode('echo "hello"', 'setup.sh');
		expect(html).toContain('shiki');
	});

	it('highlights bash/zsh extensions', async () => {
		const bashHtml = await highlightCode('echo "hi"', 'run.bash');
		const zshHtml = await highlightCode('echo "hi"', 'run.zsh');
		expect(bashHtml).toContain('shiki');
		expect(zshHtml).toContain('shiki');
	});

	it('highlights markdown files', async () => {
		const html = await highlightCode('# Hello', 'readme.md');
		expect(html).toContain('shiki');
	});

	it('highlights Python files', async () => {
		const html = await highlightCode('def foo(): pass', 'script.py');
		expect(html).toContain('shiki');
	});

	it('highlights mjs/cjs/mts/cts extensions', async () => {
		const mjsHtml = await highlightCode('export default 1', 'mod.mjs');
		const cjsHtml = await highlightCode('module.exports = 1', 'mod.cjs');
		const mtsHtml = await highlightCode('const x: number = 1', 'mod.mts');
		const ctsHtml = await highlightCode('const x: number = 1', 'mod.cts');
		expect(mjsHtml).toContain('shiki');
		expect(cjsHtml).toContain('shiki');
		expect(mtsHtml).toContain('shiki');
		expect(ctsHtml).toContain('shiki');
	});

	it('falls back to plain <pre><code> for unknown extensions', async () => {
		const html = await highlightCode('some content', 'data.csv');
		expect(html).not.toContain('shiki');
		expect(html).toContain('<pre><code>');
		expect(html).toContain('some content');
	});

	it('falls back for files with no extension', async () => {
		const html = await highlightCode('content here', 'Makefile');
		expect(html).not.toContain('shiki');
		expect(html).toContain('<pre><code>');
	});

	it('escapes HTML in fallback output', async () => {
		const html = await highlightCode('<script>alert("xss")</script>', 'file.txt');
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('highlights TOML files', async () => {
		const html = await highlightCode('[section]\nkey = "value"', 'config.toml');
		expect(html).toContain('shiki');
	});
});
