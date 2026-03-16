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

const EXT_TO_LANG: Record<string, string> = {
	js: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	ts: 'typescript',
	mts: 'typescript',
	cts: 'typescript',
	json: 'json',
	yaml: 'yaml',
	yml: 'yaml',
	toml: 'toml',
	sh: 'bash',
	bash: 'bash',
	zsh: 'bash',
	md: 'markdown',
	py: 'python'
};

export async function highlightCode(content: string, filename: string): Promise<string> {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	const lang = EXT_TO_LANG[ext];

	if (!lang) {
		return `<pre><code>${escapeHtml(content)}</code></pre>`;
	}

	try {
		const highlighter = await getHighlighter();
		return highlighter.codeToHtml(content, {
			lang,
			themes: { light: 'github-light', dark: 'github-dark' }
		});
	} catch {
		return `<pre><code>${escapeHtml(content)}</code></pre>`;
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
