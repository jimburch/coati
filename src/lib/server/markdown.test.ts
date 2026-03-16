import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

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
