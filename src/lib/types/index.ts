// Re-export schema types for convenience
export type {
	User,
	NewUser,
	Setup,
	NewSetup,
	SetupFile,
	NewSetupFile,
	Comment,
	NewComment,
	Star,
	NewStar,
	Follow,
	NewFollow,
	Tag,
	NewTag,
	Agent,
	NewAgent,
	Activity,
	NewActivity,
	Session,
	NewSession,
	DeviceFlowState,
	NewDeviceFlowState,
	SetupTag,
	NewSetupTag,
	SetupAgent,
	NewSetupAgent,
	FeedbackSubmission,
	NewFeedbackSubmission,
	SetupReport,
	NewSetupReport
} from '$lib/server/db/schema';

export type LayoutUser = {
	id: string;
	username: string;
	avatarUrl: string;
	bio: string | null;
	isBetaApproved: boolean;
	isAdmin: boolean;
	hasBetaFeatures: boolean;
};

export type ExploreSort = 'trending' | 'stars' | 'newest';

export type SetupCardProps = {
	id: string;
	slug: string;
	description: string;
	display?: string | null;
	visibility?: 'public' | 'private' | null;
	starsCount: number;
	clonesCount: number;
	updatedAt: Date;
	agents?: { id: string; displayName: string; slug: string }[];
	ownerAvatarUrl?: string;
	teamSlug?: string | null;
	teamName?: string | null;
	teamAvatarUrl?: string | null;
};

export type ProfileUser = {
	id: string;
	username: string;
	avatarUrl: string;
	name: string | null;
	bio: string | null;
	websiteUrl: string | null;
	location: string | null;
	githubUsername: string;
	setupsCount: number;
	followersCount: number;
	followingCount: number;
	createdAt: Date;
};

import { z } from 'zod';
import {
	componentTypeSchema,
	categorySchema,
	postInstallSchema,
	SLUG_NAME_REGEX
} from '@coati/validation';

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({ data: dataSchema });

export const apiErrorSchema = z.object({
	error: z.string(),
	code: z.string()
});

export const createSetupSchema = z.object({
	slug: z.string().min(1).max(100).regex(SLUG_NAME_REGEX),
	description: z.string().max(300),
	display: z.string().trim().max(150).optional()
});

/** Hex SHA-256 of a Repo fingerprint (spec §3). Opaque to the server. */
const fingerprintSchema = z
	.string()
	.regex(/^[0-9a-f]{64}$/, 'fingerprint must be 64 hex characters');

/**
 * One file in a publish. Path rules, selectors and Classification are checked
 * by `publishValidation.ts` so they get their own error codes (spec §5). Any
 * `hash` the client sends is stripped: the server computes every hash.
 */
export const createSetupFileSchema = z.object({
	path: z.string().min(1).max(1000),
	componentType: componentTypeSchema.optional(),
	description: z.string().max(1000).optional(),
	agent: z.string().max(100).nullable().optional(),
	content: z.string().min(1, 'File content cannot be empty').max(102400, 'File exceeds 100KB limit')
});

const filesSchema = z
	.array(createSetupFileSchema)
	.max(50, 'Maximum 50 files per setup')
	.refine((files) => files.reduce((sum, f) => sum + f.content.length, 0) <= 1048576, {
		message: 'Setup exceeds 1MB total limit'
	});

/** Raw tag names; the server normalizes them (`normalizeTags`) and caps the count. */
const tagsSchema = z.array(z.string().max(100)).max(100);

// Cross-reference: cli/src/validation.ts must stay in sync with this schema
export const createSetupWithFilesSchema = createSetupSchema.extend({
	description: z.string().max(300).default(''),
	category: categorySchema.optional(),
	tags: tagsSchema.optional(),
	license: z.string().max(50).optional(),
	postInstall: postInstallSchema.optional(),
	prerequisites: z.array(z.string()).optional(),
	visibility: z.enum(['public', 'private']).optional(),
	fingerprint: fingerprintSchema.optional(),
	files: filesSchema,
	teamId: z.string().uuid().optional()
});

/**
 * `PATCH /api/v1/setups/[id]` and `…/[owner]/[slug]` (spec §5). `files` is the
 * complete desired set; omitting it makes a metadata-only update. There's no
 * `slug`: renames are web-only.
 */
export const updateSetupSchema = z.object({
	baseRevision: z.number().int().min(1),
	fingerprint: fingerprintSchema.optional(),
	files: filesSchema.optional(),
	description: z.string().max(300).optional(),
	display: z.string().trim().max(150).nullable().optional(),
	category: categorySchema.nullable().optional(),
	tags: tagsSchema.optional(),
	license: z.string().max(50).nullable().optional(),
	postInstall: postInstallSchema.nullable().optional(),
	prerequisites: z.array(z.string()).nullable().optional(),
	visibility: z.enum(['public', 'private']).optional()
});

/** `POST /api/v1/setups/match` (spec §5). Hashes are the CLI's local `hashSetupFile` results. */
export const matchSetupsSchema = z.object({
	fingerprint: fingerprintSchema.optional(),
	files: z
		.array(
			z.object({
				path: z.string().min(1).max(1000),
				hash: z.string().regex(/^[0-9a-f]{64}$/, 'hash must be 64 hex characters')
			})
		)
		.max(1000)
		.default([])
});

export const updateProfileSchema = z.object({
	name: z.string().max(100).optional(),
	bio: z.string().max(500).optional(),
	websiteUrl: z
		.string()
		.transform((v) => {
			if (!v || v.trim() === '') return '';
			const trimmed = v.trim();
			if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
			return trimmed;
		})
		.refine((v) => v === '' || z.string().url().safeParse(v).success, {
			message: 'Must be a valid URL or empty string'
		})
		.optional(),
	location: z.string().max(100).optional()
});

export const createCommentSchema = z.object({
	body: z.string().min(1).max(5000),
	parentId: z.string().uuid().optional()
});

export const createReportSchema = z.object({
	reason: z.enum(['malicious', 'spam', 'inappropriate', 'other']),
	description: z.string().max(1000).optional()
});

export const usernameSchema = z
	.string()
	.min(2)
	.max(50)
	.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const createTeamSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100).regex(SLUG_NAME_REGEX),
	description: z.string().max(300).optional()
});

export const updateTeamSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(300).nullable().optional(),
	avatarUrl: z.string().url().nullable().optional()
});

export const changeTeamMemberRoleSchema = z.object({
	role: z.enum(['admin', 'member'])
});

export const createShareSchema = z.object({
	username: z.string().min(1).max(50)
});

export const createInviteSchema = z.object({
	username: z.string().min(1).max(50)
});

export const mcpServerConfigSchema = z.object({
	command: z.string().min(1),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional()
});

export const hookEntrySchema = z.object({
	type: z.literal('command'),
	command: z.string().min(1)
});

export const hookConfigSchema = z.object({
	matcher: z.string().optional(),
	hooks: z.array(hookEntrySchema)
});

export const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'] as const;
export type HookEvent = (typeof HOOK_EVENTS)[number];
