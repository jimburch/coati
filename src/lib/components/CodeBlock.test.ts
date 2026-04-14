import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Pure logic extracted from CodeBlock.svelte for unit testing

/**
 * Writes code to the clipboard.
 * Returns the promise from writeText so callers can await it.
 */
function copyCode(code: string, clipboard: { writeText: (text: string) => Promise<void> }) {
	return clipboard.writeText(code);
}

/**
 * Schedules a callback after `delay` ms and returns a handle that can be cleared.
 * Used to revert the "copied" visual feedback after ~2 seconds.
 */
function scheduleFeedbackReset(
	onReset: () => void,
	delay: number,
	timer: { setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> }
): ReturnType<typeof setTimeout> {
	return timer.setTimeout(onReset, delay);
}

/**
 * Determines the display label for the code block header.
 * If a label is provided it is used as-is; otherwise falls back to the language name
 * (capitalised), or an empty string when neither is provided.
 */
function resolveHeaderLabel(label?: string, language?: string): string {
	if (label !== undefined) return label;
	if (language) return language.charAt(0).toUpperCase() + language.slice(1);
	return '';
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('copyCode', () => {
	it('calls clipboard.writeText with the provided code', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyCode('npm install coati', { writeText });
		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText).toHaveBeenCalledWith('npm install coati');
	});

	it('calls clipboard.writeText with an empty string when code is empty', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyCode('', { writeText });
		expect(writeText).toHaveBeenCalledWith('');
	});

	it('preserves multi-line code verbatim', async () => {
		const multiline = 'line one\nline two\nline three';
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyCode(multiline, { writeText });
		expect(writeText).toHaveBeenCalledWith(multiline);
	});

	it('does not call writeText more than once per invocation', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyCode('hello', { writeText });
		expect(writeText).toHaveBeenCalledTimes(1);
	});
});

describe('scheduleFeedbackReset', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls onReset after the specified delay', () => {
		const onReset = vi.fn();
		scheduleFeedbackReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		expect(onReset).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('does not call onReset before the delay has elapsed', () => {
		const onReset = vi.fn();
		scheduleFeedbackReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		vi.advanceTimersByTime(1999);
		expect(onReset).not.toHaveBeenCalled();
	});

	it('calls onReset exactly once after delay elapses', () => {
		const onReset = vi.fn();
		scheduleFeedbackReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		vi.advanceTimersByTime(5000);
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it('returns a handle that can be used to cancel the reset', () => {
		const onReset = vi.fn();
		const handle = scheduleFeedbackReset(onReset, 2000, { setTimeout: globalThis.setTimeout });
		clearTimeout(handle);
		vi.advanceTimersByTime(2000);
		expect(onReset).not.toHaveBeenCalled();
	});
});

describe('resolveHeaderLabel', () => {
	it('returns label when explicitly provided', () => {
		expect(resolveHeaderLabel('Terminal', 'bash')).toBe('Terminal');
	});

	it('returns label even when it is an empty string', () => {
		expect(resolveHeaderLabel('', 'bash')).toBe('');
	});

	it('capitalises and returns language when no label is provided', () => {
		expect(resolveHeaderLabel(undefined, 'typescript')).toBe('Typescript');
	});

	it('returns language as-is when already capitalised', () => {
		expect(resolveHeaderLabel(undefined, 'Bash')).toBe('Bash');
	});

	it('returns empty string when neither label nor language is provided', () => {
		expect(resolveHeaderLabel(undefined, undefined)).toBe('');
	});

	it('returns empty string when both are undefined', () => {
		expect(resolveHeaderLabel()).toBe('');
	});

	it('uses label over language when both are provided', () => {
		expect(resolveHeaderLabel('My File', 'json')).toBe('My File');
	});
});
