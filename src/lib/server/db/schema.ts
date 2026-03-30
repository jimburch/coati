import { relations, sql } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	uuid,
	text,
	integer,
	boolean,
	varchar,
	timestamp,
	primaryKey,
	uniqueIndex,
	index,
	customType
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
	dataType() {
		return 'tsvector';
	}
});
import { PLACEMENT_VALUES, COMPONENT_TYPE_VALUES, CATEGORY_VALUES } from '@coati/validation';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const placementEnum = pgEnum('placement', PLACEMENT_VALUES);

export const componentTypeEnum = pgEnum('component_type', COMPONENT_TYPE_VALUES);

export const categoryEnum = pgEnum('category', CATEGORY_VALUES);

export const actionTypeEnum = pgEnum('action_type', [
	'created_setup',
	'starred_setup',
	'commented',
	'followed_user',
	'cloned_setup'
]);

export const feedbackCategoryEnum = pgEnum('feedback_category', [
	'bug',
	'improvement',
	'feature-request'
]);

export const setupReportReasonEnum = pgEnum('setup_report_reason', [
	'malicious',
	'spam',
	'inappropriate',
	'other'
]);

export const setupReportStatusEnum = pgEnum('setup_report_status', [
	'pending',
	'reviewed',
	'dismissed',
	'actioned'
]);

// ─── Tier 1: No FK dependencies ─────────────────────────────────────────────

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	githubId: integer('github_id').unique().notNull(),
	username: varchar('username', { length: 50 }).unique().notNull(),
	email: text('email').notNull(),
	avatarUrl: text('avatar_url').notNull(),
	name: varchar('name', { length: 100 }),
	bio: varchar('bio', { length: 500 }),
	websiteUrl: text('website_url'),
	location: varchar('location', { length: 100 }),
	githubUsername: text('github_username').notNull(),
	setupsCount: integer('setups_count').default(0).notNull(),
	followersCount: integer('followers_count').default(0).notNull(),
	followingCount: integer('following_count').default(0).notNull(),
	isAdmin: boolean('is_admin').default(false).notNull(),
	isBetaApproved: boolean('is_beta_approved').default(false).notNull(),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const tags = pgTable('tags', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 50 }).unique().notNull()
});

export const agents = pgTable('agents', {
	id: uuid('id').defaultRandom().primaryKey(),
	slug: varchar('slug', { length: 100 }).unique().notNull(),
	displayName: varchar('display_name', { length: 100 }).unique().notNull(),
	icon: text('icon'),
	website: text('website'),
	official: boolean('official').default(false).notNull()
});

// ─── Tier 2: Depends on users ───────────────────────────────────────────────

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'cascade' })
		.notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const setups = pgTable(
	'setups',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		slug: varchar('slug', { length: 100 }).notNull(),
		description: varchar('description', { length: 300 }).notNull(),
		readme: text('readme'),
		category: categoryEnum('category'),
		license: varchar('license', { length: 50 }),
		minToolVersion: varchar('min_tool_version', { length: 20 }),
		postInstall: text('post_install').array(),
		prerequisites: text('prerequisites').array(),
		starsCount: integer('stars_count').default(0).notNull(),
		clonesCount: integer('clones_count').default(0).notNull(),
		commentsCount: integer('comments_count').default(0).notNull(),
		featuredAt: timestamp('featured_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		searchVector: tsvector('search_vector').generatedAlwaysAs(
			sql`setweight(to_tsvector('english', coalesce(name, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B')`
		)
	},
	(table) => [
		uniqueIndex('setups_user_id_slug_idx').on(table.userId, table.slug),
		index('setups_user_id_idx').on(table.userId),
		index('setups_created_at_idx').on(table.createdAt),
		index('setups_search_vector_idx').using('gin', table.searchVector)
	]
);

export const follows = pgTable(
	'follows',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		followerId: uuid('follower_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		followingId: uuid('following_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('follows_follower_following_idx').on(table.followerId, table.followingId),
		index('follows_following_id_idx').on(table.followingId)
	]
);

export const deviceFlowStates = pgTable('device_flow_states', {
	id: uuid('id').defaultRandom().primaryKey(),
	deviceCode: text('device_code').unique().notNull(),
	userCode: text('user_code').unique().notNull(),
	githubDeviceCode: text('github_device_code').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ─── Tier 3: Depends on setups ──────────────────────────────────────────────

export const setupFiles = pgTable(
	'setup_files',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		source: text('source').notNull(),
		target: text('target').notNull(),
		placement: placementEnum('placement').notNull(),
		componentType: componentTypeEnum('component_type').notNull().default('instruction'),
		description: text('description'),
		content: text('content').notNull(),
		agent: varchar('agent', { length: 100 }).references(() => agents.slug, {
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('setup_files_setup_id_idx').on(table.setupId)]
);

export const setupTags = pgTable(
	'setup_tags',
	{
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		tagId: uuid('tag_id')
			.references(() => tags.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.setupId, table.tagId] }),
		index('setup_tags_tag_id_idx').on(table.tagId),
		index('setup_tags_setup_id_tag_id_idx').on(table.setupId, table.tagId)
	]
);

export const setupAgents = pgTable(
	'setup_agents',
	{
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		agentId: uuid('agent_id')
			.references(() => agents.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.setupId, table.agentId] }),
		index('setup_agents_agent_id_idx').on(table.agentId),
		index('setup_agents_setup_id_agent_id_idx').on(table.setupId, table.agentId)
	]
);

export const stars = pgTable(
	'stars',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('stars_user_id_setup_id_idx').on(table.userId, table.setupId),
		index('stars_setup_id_idx').on(table.setupId),
		index('stars_created_at_idx').on(table.createdAt)
	]
);

export const comments = pgTable(
	'comments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		body: text('body').notNull(),
		parentId: uuid('parent_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('comments_setup_id_idx').on(table.setupId),
		index('comments_user_id_idx').on(table.userId)
	]
);

export const activities = pgTable(
	'activities',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		setupId: uuid('setup_id').references(() => setups.id, { onDelete: 'set null' }),
		targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),
		commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'set null' }),
		actionType: actionTypeEnum('action_type').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('activities_user_id_created_at_idx').on(table.userId, table.createdAt)]
);

// ─── Feedback ────────────────────────────────────────────────────────────────

export const feedbackSubmissions = pgTable(
	'feedback_submissions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		category: feedbackCategoryEnum('category').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		pageUrl: text('page_url').notNull(),
		githubIssueUrl: text('github_issue_url').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('feedback_submissions_user_id_idx').on(table.userId)]
);

export const setupReports = pgTable(
	'setup_reports',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		reporterId: uuid('reporter_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		reason: setupReportReasonEnum('reason').notNull(),
		description: text('description'),
		status: setupReportStatusEnum('status').default('pending').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' })
	},
	(table) => [
		uniqueIndex('setup_reports_setup_id_reporter_id_idx').on(table.setupId, table.reporterId),
		index('setup_reports_setup_id_idx').on(table.setupId),
		index('setup_reports_status_idx').on(table.status)
	]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	setups: many(setups),
	stars: many(stars),
	comments: many(comments),
	activities: many(activities),
	followers: many(follows, { relationName: 'following' }),
	following: many(follows, { relationName: 'follower' }),
	reports: many(setupReports, { relationName: 'reporter' })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const setupsRelations = relations(setups, ({ one, many }) => ({
	user: one(users, { fields: [setups.userId], references: [users.id] }),
	files: many(setupFiles),
	setupTags: many(setupTags),
	setupAgents: many(setupAgents),
	stars: many(stars),
	comments: many(comments),
	activities: many(activities),
	reports: many(setupReports)
}));

export const followsRelations = relations(follows, ({ one }) => ({
	follower: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: 'follower'
	}),
	following: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: 'following'
	})
}));

export const deviceFlowStatesRelations = relations(deviceFlowStates, ({ one }) => ({
	user: one(users, { fields: [deviceFlowStates.userId], references: [users.id] })
}));

export const setupFilesRelations = relations(setupFiles, ({ one }) => ({
	setup: one(setups, { fields: [setupFiles.setupId], references: [setups.id] }),
	agent: one(agents, { fields: [setupFiles.agent], references: [agents.slug] })
}));

export const setupTagsRelations = relations(setupTags, ({ one }) => ({
	setup: one(setups, { fields: [setupTags.setupId], references: [setups.id] }),
	tag: one(tags, { fields: [setupTags.tagId], references: [tags.id] })
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	setupTags: many(setupTags)
}));

export const setupAgentsRelations = relations(setupAgents, ({ one }) => ({
	setup: one(setups, { fields: [setupAgents.setupId], references: [setups.id] }),
	agent: one(agents, { fields: [setupAgents.agentId], references: [agents.id] })
}));

export const agentsRelations = relations(agents, ({ many }) => ({
	setupAgents: many(setupAgents)
}));

export const starsRelations = relations(stars, ({ one }) => ({
	user: one(users, { fields: [stars.userId], references: [users.id] }),
	setup: one(setups, { fields: [stars.setupId], references: [setups.id] })
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	setup: one(setups, { fields: [comments.setupId], references: [setups.id] }),
	user: one(users, { fields: [comments.userId], references: [users.id] }),
	parent: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: 'replies'
	}),
	replies: many(comments, { relationName: 'replies' })
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
	user: one(users, { fields: [activities.userId], references: [users.id] }),
	setup: one(setups, { fields: [activities.setupId], references: [setups.id] }),
	targetUser: one(users, { fields: [activities.targetUserId], references: [users.id] }),
	comment: one(comments, { fields: [activities.commentId], references: [comments.id] })
}));

export const setupReportsRelations = relations(setupReports, ({ one }) => ({
	setup: one(setups, { fields: [setupReports.setupId], references: [setups.id] }),
	reporter: one(users, {
		fields: [setupReports.reporterId],
		references: [users.id],
		relationName: 'reporter'
	}),
	reviewer: one(users, { fields: [setupReports.reviewedBy], references: [users.id] })
}));

// ─── Type Exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Setup = typeof setups.$inferSelect;
export type NewSetup = typeof setups.$inferInsert;

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;

export type DeviceFlowState = typeof deviceFlowStates.$inferSelect;
export type NewDeviceFlowState = typeof deviceFlowStates.$inferInsert;

export type SetupFile = typeof setupFiles.$inferSelect;
export type NewSetupFile = typeof setupFiles.$inferInsert;

export type SetupTag = typeof setupTags.$inferSelect;
export type NewSetupTag = typeof setupTags.$inferInsert;

export type SetupAgent = typeof setupAgents.$inferSelect;
export type NewSetupAgent = typeof setupAgents.$inferInsert;

export type Star = typeof stars.$inferSelect;
export type NewStar = typeof stars.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;
export type NewFeedbackSubmission = typeof feedbackSubmissions.$inferInsert;

export type SetupReport = typeof setupReports.$inferSelect;
export type NewSetupReport = typeof setupReports.$inferInsert;
