import { z } from 'zod';

// ─── Const Arrays ─────────────────────────────────────────────────────────────

export const COMPONENT_TYPE_VALUES = [
	'instruction',
	'command',
	'skill',
	'mcp_server',
	'hook',
	'config',
	'policy',
	'agent_def',
	'ignore',
	'setup_script'
] as const;

export const CATEGORY_VALUES = [
	'web-dev',
	'mobile',
	'data-science',
	'devops',
	'systems',
	'general'
] as const;

// ─── TypeScript Types ──────────────────────────────────────────────────────────

/** `global` for a `~/` path, `project` otherwise. Derived from the path (spec §3). */
export type Placement = 'global' | 'project';
export type ComponentType = (typeof COMPONENT_TYPE_VALUES)[number];
export type Category = (typeof CATEGORY_VALUES)[number];

// ─── Regex Patterns ───────────────────────────────────────────────────────────

/** URL-safe name/slug: lowercase letters, digits, hyphens, no leading/trailing hyphens */
export const SLUG_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Semantic version: MAJOR.MINOR.PATCH */
export const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const componentTypeSchema = z.enum(COMPONENT_TYPE_VALUES);
export const categorySchema = z.enum(CATEGORY_VALUES);

/** Array of shell commands to display after a successful clone */
export const postInstallSchema = z.array(z.string());

// ─── Path Safety ──────────────────────────────────────────────────────────────

/**
 * Returns true if `value` is a safe same-origin redirect target — exactly one
 * leading `/` followed by a non-separator character. Blocks protocol-relative
 * URLs (`//evil.com`), backslash escapes (`/\evil.com`), absolute URLs, and
 * non-string values. Canonical for both the OAuth login handler (write-time)
 * and the OAuth callback handler (read-time).
 */
export function isSafeInternalRedirect(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return /^\/(?![/\\])/.test(value);
}

/**
 * Returns true if `pathStr` is a safe file path for a SetupFile: it stays inside
 * its root and never touches a git directory. A leading `~/` makes it a global
 * path, resolved against the home directory; `~` anywhere else is rejected.
 * Canonical for both server-side publish validation and CLI-side clone
 * validation — no layer is allowed to accept a path this function rejects.
 *
 * This checks the file part only. A Setup path's `#selector` is handled by
 * `parseSetupPath` in `@coati/content-hash`.
 */
export function isSafeRelativePath(pathStr: string): boolean {
	if (typeof pathStr !== 'string' || pathStr.length === 0) return false;
	const rest = pathStr.startsWith('~/') ? pathStr.slice(2) : pathStr;
	if (rest.length === 0 || rest.includes('~')) return false;
	if (rest.includes('\0')) return false;
	if (rest.startsWith('/') || rest.startsWith('\\')) return false;
	// Windows drive letter (e.g. "C:\foo" or "C:/foo")
	if (/^[a-zA-Z]:[\\/]/.test(rest)) return false;
	// Split on both separators so Windows-style `..\..\foo` is also caught on posix.
	for (const seg of rest.split(/[\\/]+/)) {
		if (seg === '..') return false;
		// Case-insensitive: `.GIT` is the same directory on macOS and Windows.
		if (seg.toLowerCase() === '.git') return false;
	}
	return true;
}
