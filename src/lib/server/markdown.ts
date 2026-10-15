import { Marked } from 'marked';
import type { HighlighterCore } from 'shiki/core';
import sanitizeHtml from 'sanitize-html';

/**
 * Shiki's JS regex engine is the CPU-heavy path on a request (Workers Free is
 * 10ms of CPU). Grammars load on the first highlight, not at isolate start, and
 * identical inputs are reused for the life of the isolate.
 */
const HIGHLIGHT_CACHE_LIMIT = 32;

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

function remember(cache: Map<string, string>, key: string, value: string): string {
	if (cache.has(key)) cache.delete(key);
	cache.set(key, value);
	if (cache.size > HIGHLIGHT_CACHE_LIMIT) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	return value;
}

const renderCache = new Map<string, string>();
const highlightCache = new Map<string, string>();

const sanitizeOptions: sanitizeHtml.IOptions = {
	allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'input', 'del', 'ins']),
	allowedAttributes: {
		...sanitizeHtml.defaults.allowedAttributes,
		'*': ['class', 'style']
	},
	// Leave Shiki's `--shiki-*` custom properties intact and avoid pulling in a CSS parser.
	parseStyleAttributes: false
};

function sanitize(html: string): string {
	return sanitizeHtml(html, sanitizeOptions);
}

export async function renderMarkdown(content: string): Promise<string> {
	if (!content) return '';
	const cached = renderCache.get(content);
	if (cached !== undefined) return remember(renderCache, content, cached);

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
	return remember(renderCache, content, sanitize(html));
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

	const cacheKey = `${lang}\0${content}`;
	const cached = highlightCache.get(cacheKey);
	if (cached !== undefined) return remember(highlightCache, cacheKey, cached);

	try {
		const highlighter = await getHighlighter();
		return remember(
			highlightCache,
			cacheKey,
			highlighter.codeToHtml(content, {
				lang,
				themes: {
					dark: 'github-dark',
					light: 'github-light'
				},
				defaultColor: false
			})
		);
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
