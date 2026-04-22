import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Pure logic extracted from BadgeEmbed.svelte for unit testing

function buildEmbedSnippet(badgeUrl: string, setupUrl: string): string {
	return `[![Clone on Coati](${badgeUrl})](${setupUrl})`;
}

function copyEmbedSnippet(text: string, clipboard: { writeText: (t: string) => Promise<void> }) {
	return clipboard.writeText(text);
}

function scheduleReset(
	onReset: () => void,
	delay: number,
	timer: { setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> }
): ReturnType<typeof setTimeout> {
	return timer.setTimeout(onReset, delay);
}

// ─── buildEmbedSnippet ────────────────────────────────────────────────────────

describe('buildEmbedSnippet', () => {
	it('interpolates badge URL and setup URL into the markdown snippet', () => {
		const badgeUrl = 'https://coati.dev/jimburch/claude-code-pro/badge.svg';
		const setupUrl = 'https://coati.dev/jimburch/claude-code-pro';
		expect(buildEmbedSnippet(badgeUrl, setupUrl)).toBe(
			'[![Clone on Coati](https://coati.dev/jimburch/claude-code-pro/badge.svg)](https://coati.dev/jimburch/claude-code-pro)'
		);
	});

	it('uses the literal alt text "Clone on Coati"', () => {
		const snippet = buildEmbedSnippet('https://example.com/badge.svg', 'https://example.com');
		expect(snippet).toContain('![Clone on Coati]');
	});

	it('wraps the badge image in a link to the setup URL', () => {
		const setupUrl = 'https://coati.dev/alice/my-setup';
		const snippet = buildEmbedSnippet('https://coati.dev/alice/my-setup/badge.svg', setupUrl);
		expect(snippet).toMatch(/\]\(https:\/\/coati\.dev\/alice\/my-setup\)$/);
	});

	it('works for team setup URLs', () => {
		const badgeUrl = 'https://coati.dev/org/my-team/my-setup/badge.svg';
		const setupUrl = 'https://coati.dev/org/my-team/my-setup';
		expect(buildEmbedSnippet(badgeUrl, setupUrl)).toBe(
			'[![Clone on Coati](https://coati.dev/org/my-team/my-setup/badge.svg)](https://coati.dev/org/my-team/my-setup)'
		);
	});

	it('produces valid markdown image-link syntax', () => {
		const snippet = buildEmbedSnippet('https://x.dev/badge.svg', 'https://x.dev/setup');
		// Must start with [![
		expect(snippet.startsWith('[![')).toBe(true);
		// Must contain the closing link paren at the end
		expect(snippet.endsWith(')')).toBe(true);
	});
});

// ─── copyEmbedSnippet ─────────────────────────────────────────────────────────

describe('copyEmbedSnippet', () => {
	it('calls clipboard.writeText with the exact snippet', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		const snippet = buildEmbedSnippet(
			'https://coati.dev/jimburch/setup/badge.svg',
			'https://coati.dev/jimburch/setup'
		);
		await copyEmbedSnippet(snippet, { writeText });
		expect(writeText).toHaveBeenCalledWith(snippet);
	});

	it('calls clipboard.writeText exactly once per invocation', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyEmbedSnippet('some snippet', { writeText });
		expect(writeText).toHaveBeenCalledTimes(1);
	});

	it('passes the full snippet string verbatim, including special characters', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		const snippet = '[![Clone on Coati](https://coati.dev/u/s/badge.svg)](https://coati.dev/u/s)';
		await copyEmbedSnippet(snippet, { writeText });
		expect(writeText).toHaveBeenCalledWith(snippet);
	});
});

// ─── scheduleReset ────────────────────────────────────────────────────────────

describe('scheduleReset', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls onReset after 2000ms', () => {
		const onReset = vi.fn();
		scheduleReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		expect(onReset).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('does not call onReset before the delay elapses', () => {
		const onReset = vi.fn();
		scheduleReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		vi.advanceTimersByTime(1999);
		expect(onReset).not.toHaveBeenCalled();
	});

	it('calls onReset exactly once after delay', () => {
		const onReset = vi.fn();
		scheduleReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		vi.advanceTimersByTime(5000);
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('returns a handle that can cancel the reset', () => {
		const onReset = vi.fn();
		const handle = scheduleReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		clearTimeout(handle);
		vi.advanceTimersByTime(2000);
		expect(onReset).not.toHaveBeenCalled();
	});
});
