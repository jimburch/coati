import { Marked } from 'marked';
import type { HighlighterCore } from 'shiki/core';
import sanitizeHtml from 'sanitize-html';

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = loadHighlighter();
	}
	return highlighterPromise;
}

async function loadHighlighter(): Promise<HighlighterCore> {
	const { createHighlighterCore } = await import('shiki/core');
	const { createJavaScriptRegexEngine } = await import('shiki/engine/javascript');
	const [
		javascript,
		typescript,
		json,
		yaml,
		toml,
		bash,
		markdown,
		python,
		githubDark,
		githubLight
	] = await Promise.all([
		import('@shikijs/langs/javascript'),
		import('@shikijs/langs/typescript'),
		import('@shikijs/langs/json'),
		import('@shikijs/langs/yaml'),
		import('@shikijs/langs/toml'),
		import('@shikijs/langs/bash'),
		import('@shikijs/langs/markdown'),
		import('@shikijs/langs/python'),
		import('@shikijs/themes/github-dark'),
		import('@shikijs/themes/github-light')
	]);

	return createHighlighterCore({
		engine: createJavaScriptRegexEngine(),
		themes: [githubDark.default, githubLight.default],
		langs: [
			javascript.default,
			typescript.default,
			json.default,
			yaml.default,
			toml.default,
			bash.default,
			markdown.default,
			python.default
		]
	});
}

const SHIKI_COLOR = [/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i];

/** Dual-theme Shiki sets only these custom properties on `pre` and `span`. */
const shikiStyles: sanitizeHtml.IOptions['allowedStyles'] = {
	pre: {
		'--shiki-dark': SHIKI_COLOR,
		'--shiki-light': SHIKI_COLOR,
		'--shiki-dark-bg': SHIKI_COLOR,
		'--shiki-light-bg': SHIKI_COLOR
	},
	span: {
		'--shiki-dark': SHIKI_COLOR,
		'--shiki-light': SHIKI_COLOR,
		'--shiki-dark-bg': SHIKI_COLOR,
		'--shiki-light-bg': SHIKI_COLOR
	}
};

const sanitizeOptions: sanitizeHtml.IOptions = {
	allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'del', 'ins']),
	allowedAttributes: {
		...sanitizeHtml.defaults.allowedAttributes,
		pre: ['class', 'style'],
		code: ['class'],
		span: ['class', 'style']
	},
	allowedStyles: shikiStyles
};

function sanitize(html: string): string {
	return sanitizeHtml(html, sanitizeOptions);
}

export async function renderMarkdown(content: string): Promise<string> {
	if (!content) return '';

	const highlighter = await getHighlighter();

	const marked = new Marked({
		async: true,
		renderer: {
			code({ text, lang }) {
				const language = lang && highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
				try {
					return highlighter.codeToHtml(text, {
						lang: language,
						themes: {
							dark: 'github-dark',
							light: 'github-light'
						},
						defaultColor: false
					});
				} catch {
					return `<pre><code>${escapeHtml(text)}</code></pre>`;
				}
			}
		}
	});

	const html = await marked.parse(content);
	return sanitize(html);
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
			themes: {
				dark: 'github-dark',
				light: 'github-light'
			},
			defaultColor: false
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
