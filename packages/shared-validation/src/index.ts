import { z } from 'zod';

// ─── Const Arrays ─────────────────────────────────────────────────────────────

export const PLACEMENT_VALUES = ['global', 'project'] as const;

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

export type Placement = (typeof PLACEMENT_VALUES)[number];
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
 * Returns true if `pathStr` is safe to treat as a relative path that stays
 * inside its intended root. Canonical for both server-side publish validation
 * and CLI-side clone validation — no layer is allowed to accept a path this
 * function rejects.
 */
export function isSafeRelativePath(pathStr: string): boolean {
	if (typeof pathStr !== 'string' || pathStr.length === 0) return false;
	if (pathStr.includes('\0')) return false;
	if (pathStr.startsWith('/') || pathStr.startsWith('\\')) return false;
	// Windows drive letter (e.g. "C:\foo" or "C:/foo")
	if (/^[a-zA-Z]:[\\/]/.test(pathStr)) return false;
	// Split on both separators so Windows-style `..\..\foo` is also caught on posix.
	const segments = pathStr.split(/[\\/]+/);
	for (const seg of segments) {
		if (seg === '..') return false;
	}
	return true;
}
