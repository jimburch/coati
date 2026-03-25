/**
 * CLI manifest validation schemas using Zod.
 *
 * These schemas mirror the server's `createSetupSchema` and `createSetupFileSchema`
 * defined in src/lib/types/index.ts. Keep in sync when server schemas change.
 * Cross-reference: src/lib/types/index.ts → createSetupWithFilesSchema, createSetupFileSchema
 */

import { z } from 'zod';

export const manifestFilePlacementSchema = z.enum(['global', 'project', 'relative']);

// Cross-reference: src/lib/types/index.ts → componentTypeEnum (schema.ts)
export const manifestFileComponentTypeSchema = z.enum([
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
]);

export const manifestCategorySchema = z.enum([
	'web-dev',
	'mobile',
	'data-science',
	'devops',
	'systems',
	'general'
]);

export const manifestFileEntrySchema = z.object({
	source: z.string().min(1, 'Required, must be a non-empty string'),
	target: z.string().min(1, 'Required, must be a non-empty string'),
	placement: manifestFilePlacementSchema,
	componentType: manifestFileComponentTypeSchema.optional(),
	description: z.string().optional(),
	agent: z.string().optional()
});

export const manifestSchema = z.object({
	$schema: z.string().optional(),
	name: z
		.string()
		.min(1, 'Required, must be a non-empty string')
		.max(100, 'Must be 100 characters or fewer')
		.regex(
			/^[a-z0-9]+(-[a-z0-9]+)*$/,
			'Must be lowercase letters, digits, and hyphens only (e.g. my-setup)'
		),
	version: z
		.string()
		.min(1, 'Required, must be a non-empty string')
		.regex(/^\d+\.\d+\.\d+$/, 'Must be semver format (e.g. 1.0.0)'),
	description: z.string().max(300, 'Must be 300 characters or fewer'),
	files: z.array(manifestFileEntrySchema).min(1, 'Must contain at least one file'),
	category: manifestCategorySchema.optional(),
	license: z.string().max(50, 'Must be a string of 50 characters or fewer').optional(),
	minToolVersion: z.string().max(20, 'Must be a string of 20 characters or fewer').optional(),
	postInstall: z.array(z.string()).optional(),
	prerequisites: z.array(z.string()).optional(),
	readme: z.string().optional(),
	agents: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional()
});

/**
 * Convert a Zod issue path (e.g. ['files', 0, 'source']) to a dot/bracket field string
 * (e.g. 'files[0].source'), matching the ValidationError.field format used by validateManifest().
 */
export function zodPathToField(path: (string | number)[]): string {
	if (path.length === 0) return '';
	return path.reduce<string>((acc, segment, i) => {
		if (typeof segment === 'number') {
			return `${acc}[${segment}]`;
		}
		return i === 0 ? segment : `${acc}.${segment}`;
	}, '');
}
