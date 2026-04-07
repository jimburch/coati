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
};

export type ExploreSort = 'trending' | 'stars' | 'newest';

export type SetupCardProps = {
	id: string;
	name: string;
	slug: string;
	description: string;
	starsCount: number;
	clonesCount: number;
	updatedAt: Date;
	agents?: { id: string; displayName: string; slug: string }[];
	ownerAvatarUrl?: string;
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
	name: z.string().min(1).max(100),
	slug: z.string().min(1).max(100).regex(SLUG_NAME_REGEX),
	description: z.string().max(300)
});

export const createSetupFileSchema = z.object({
	path: z.string().min(1),
	componentType: componentTypeSchema.default('instruction'),
	description: z.string().optional(),
	content: z.string().min(1).max(102400, 'File exceeds 100KB limit')
});

// Cross-reference: cli/src/validation.ts must stay in sync with this schema
export const createSetupWithFilesSchema = createSetupSchema
	.extend({
		category: categorySchema.optional(),
		license: z.string().max(50).optional(),
		minToolVersion: z.string().max(20).optional(),
		postInstall: postInstallSchema.optional(),
		prerequisites: z.array(z.string()).optional(),
		files: z.array(createSetupFileSchema).optional(),
		agentIds: z.array(z.string().uuid()).optional(),
		tagIds: z.array(z.string().uuid()).optional()
	})
	.refine((data) => !data.files || data.files.length <= 50, {
		message: 'Maximum 50 files per setup'
	})
	.refine(
		(data) => !data.files || data.files.reduce((sum, f) => sum + f.content.length, 0) <= 1048576,
		{ message: 'Setup exceeds 1MB total limit' }
	);

export const updateSetupSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		slug: z.string().min(1).max(100).regex(SLUG_NAME_REGEX).optional(),
		description: z.string().max(300).optional(),
		readme: z.string().optional(),
		category: categorySchema.nullable().optional(),
		license: z.string().max(50).nullable().optional(),
		minToolVersion: z.string().max(20).nullable().optional(),
		postInstall: postInstallSchema.nullable().optional(),
		prerequisites: z.array(z.string()).nullable().optional(),
		files: z.array(createSetupFileSchema).optional()
	})
	.refine((data) => !data.files || data.files.length <= 50, {
		message: 'Maximum 50 files per setup'
	})
	.refine(
		(data) => !data.files || data.files.reduce((sum, f) => sum + f.content.length, 0) <= 1048576,
		{ message: 'Setup exceeds 1MB total limit' }
	);

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
