import { describe, it, expect } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
	it('returns "dark" for dark preference', () => {
		expect(resolveTheme('dark', false)).toBe('dark');
		expect(resolveTheme('dark', true)).toBe('dark');
	});

	it('returns "light" for light preference', () => {
		expect(resolveTheme('light', false)).toBe('light');
		expect(resolveTheme('light', true)).toBe('light');
	});

	it('returns "dark" when system preference is dark', () => {
		expect(resolveTheme('system', true)).toBe('dark');
	});

	it('returns "light" when system preference is light', () => {
		expect(resolveTheme('system', false)).toBe('light');
	});

	it('defaults to "dark" for invalid preference', () => {
		expect(resolveTheme('invalid' as never, false)).toBe('dark');
		expect(resolveTheme('' as never, false)).toBe('dark');
	});

	it('defaults to "dark" for undefined preference', () => {
		expect(resolveTheme(undefined as never, false)).toBe('dark');
	});
});
