/**
 * CLI manifest validation schemas using Zod.
 *
 * Enum values and regex patterns are imported from the shared @coati/validation
 * package to stay in sync with the server schema automatically.
 * Cross-reference: src/lib/types/index.ts → createSetupWithFilesSchema, createSetupFileSchema
 */

import { z } from 'zod';
import {
	PLACEMENT_VALUES,
	COMPONENT_TYPE_VALUES,
	CATEGORY_VALUES,
	SLUG_NAME_REGEX,
	SEMVER_REGEX
} from '@coati/validation';

export const manifestFilePlacementSchema = z.enum(PLACEMENT_VALUES);

export const manifestFileComponentTypeSchema = z.enum(COMPONENT_TYPE_VALUES);

export const manifestCategorySchema = z.enum(CATEGORY_VALUES);

export const manifestFileEntrySchema = z.object({
	path: z.string().min(1, 'Required, must be a non-empty string'),
	componentType: manifestFileComponentTypeSchema.optional(),
	description: z.string().optional(),
	agent: z.string().optional()
});

export const manifestSchema = z.object({
	$schema: z.string().optional(),
	id: z.string().uuid().optional(),
	sourceId: z.string().uuid().optional(),
	display: z.string().trim().max(150, 'Must be 150 characters or fewer').optional(),
	name: z
		.string()
		.min(1, 'Required, must be a non-empty string')
		.max(100, 'Must be 100 characters or fewer')
		.regex(SLUG_NAME_REGEX, 'Must be lowercase letters, digits, and hyphens only (e.g. my-setup)'),
	version: z
		.string()
		.min(1, 'Required, must be a non-empty string')
		.regex(SEMVER_REGEX, 'Must be semver format (e.g. 1.0.0)'),
	description: z.string().max(300, 'Must be 300 characters or fewer'),
	files: z.array(manifestFileEntrySchema).min(1, 'Must contain at least one file'),
	category: manifestCategorySchema.optional(),
	license: z.string().max(50, 'Must be a string of 50 characters or fewer').optional(),
	minToolVersion: z.string().max(20, 'Must be a string of 20 characters or fewer').optional(),
	postInstall: z.array(z.string()).optional(),
	prerequisites: z.array(z.string()).optional(),
	agents: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	visibility: z.enum(['public', 'private']).optional(),
	org: z
		.string()
		.min(1)
		.max(100)
		.regex(SLUG_NAME_REGEX, 'Must be a valid team slug (lowercase letters, digits, hyphens)')
		.optional(),
	/** Clone-tracking fields — written by `coati clone`, ignored during publish. */
	source: z.string().optional(),
	clonedAt: z.string().optional(),
	revision: z.string().optional()
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
