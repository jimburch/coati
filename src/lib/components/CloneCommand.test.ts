import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Pure logic extracted from CloneCommand.svelte for unit testing

function buildCloneCommand(username: string, slug: string): string {
	return `npx @coati/sh@latest clone ${username}/${slug}`;
}

function copyToClipboard(text: string, clipboard: { writeText: (t: string) => Promise<void> }) {
	return clipboard.writeText(text);
}

function scheduleReset(
	onReset: () => void,
	delay: number,
	timer: { setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> }
): ReturnType<typeof setTimeout> {
	return timer.setTimeout(onReset, delay);
}

// ─── buildCloneCommand ────────────────────────────────────────────────────────

describe('buildCloneCommand', () => {
	it('builds the correct npx command for a given username and slug', () => {
		expect(buildCloneCommand('jimburch', 'claude-code-pro')).toBe(
			'npx @coati/sh@latest clone jimburch/claude-code-pro'
		);
	});

	it('correctly joins username and slug with a slash', () => {
		const result = buildCloneCommand('alice', 'my-setup');
		expect(result).toContain('alice/my-setup');
	});

	it('always includes the npx @coati/sh@latest prefix', () => {
		const result = buildCloneCommand('bob', 'setup');
		expect(result.startsWith('npx @coati/sh@latest clone ')).toBe(true);
	});

	it('handles usernames and slugs with hyphens', () => {
		expect(buildCloneCommand('my-user', 'my-cool-setup')).toBe(
			'npx @coati/sh@latest clone my-user/my-cool-setup'
		);
	});
});

// ─── copyToClipboard ──────────────────────────────────────────────────────────

describe('copyToClipboard', () => {
	it('calls clipboard.writeText with the clone command', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		const cmd = buildCloneCommand('jimburch', 'claude-code-pro');
		await copyToClipboard(cmd, { writeText });
		expect(writeText).toHaveBeenCalledWith(cmd);
	});

	it('calls clipboard.writeText exactly once per invocation', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyToClipboard('some command', { writeText });
		expect(writeText).toHaveBeenCalledTimes(1);
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
