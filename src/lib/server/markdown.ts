import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';
import DOMPurify from 'isomorphic-dompurify';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-dark', 'github-light'],
			langs: ['javascript', 'typescript', 'json', 'yaml', 'toml', 'bash', 'markdown', 'python']
		});
	}
	return highlighterPromise;
}

export async function renderMarkdown(content: string): Promise<string> {
	const highlighter = await getHighlighter();

	const marked = new Marked({
		async: true,
		renderer: {
			code({ text, lang }) {
				const language = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
				try {
					return highlighter.codeToHtml(text, {
						lang: language,
						themes: { light: 'github-light', dark: 'github-dark' }
					});
				} catch {
					return `<pre><code>${escapeHtml(text)}</code></pre>`;
				}
			}
		}
	});

	const html = await marked.parse(content);
	return DOMPurify.sanitize(html, {
		ADD_TAGS: ['span'],
		ADD_ATTR: ['style', 'class']
	});
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
