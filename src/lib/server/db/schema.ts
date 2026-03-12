import { relations } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	uuid,
	text,
	integer,
	varchar,
	timestamp,
	primaryKey,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const placementEnum = pgEnum('placement', ['global', 'project', 'relative']);

export const actionTypeEnum = pgEnum('action_type', [
	'created_setup',
	'starred_setup',
	'commented',
	'followed_user',
	'cloned_setup'
]);

// ─── Tier 1: No FK dependencies ─────────────────────────────────────────────

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	githubId: integer('github_id').unique().notNull(),
	username: varchar('username', { length: 50 }).unique().notNull(),
	email: text('email').notNull(),
	avatarUrl: text('avatar_url').notNull(),
	bio: varchar('bio', { length: 500 }),
	websiteUrl: text('website_url'),
	githubUsername: text('github_username').notNull(),
	setupsCount: integer('setups_count').default(0).notNull(),
	followersCount: integer('followers_count').default(0).notNull(),
	followingCount: integer('following_count').default(0).notNull(),
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

export const tools = pgTable('tools', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 100 }).unique().notNull(),
	slug: varchar('slug', { length: 100 }).unique().notNull()
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
		version: varchar('version', { length: 20 }).default('0.1.0').notNull(),
		description: varchar('description', { length: 300 }).notNull(),
		readmePath: text('readme_path'),
		starsCount: integer('stars_count').default(0).notNull(),
		clonesCount: integer('clones_count').default(0).notNull(),
		commentsCount: integer('comments_count').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('setups_user_id_slug_idx').on(table.userId, table.slug),
		index('setups_user_id_idx').on(table.userId)
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
		description: text('description'),
		content: text('content').notNull(),
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
		index('setup_tags_tag_id_idx').on(table.tagId)
	]
);

export const setupTools = pgTable(
	'setup_tools',
	{
		setupId: uuid('setup_id')
			.references(() => setups.id, { onDelete: 'cascade' })
			.notNull(),
		toolId: uuid('tool_id')
			.references(() => tools.id, { onDelete: 'cascade' })
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.setupId, table.toolId] }),
		index('setup_tools_tool_id_idx').on(table.toolId)
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
		index('stars_setup_id_idx').on(table.setupId)
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
	(table) => [index('comments_setup_id_idx').on(table.setupId)]
);

export const activities = pgTable(
	'activities',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		setupId: uuid('setup_id').references(() => setups.id, { onDelete: 'set null' }),
		actionType: actionTypeEnum('action_type').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('activities_user_id_created_at_idx').on(table.userId, table.createdAt)]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	setups: many(setups),
	stars: many(stars),
	comments: many(comments),
	activities: many(activities),
	followers: many(follows, { relationName: 'following' }),
	following: many(follows, { relationName: 'follower' })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

export const setupsRelations = relations(setups, ({ one, many }) => ({
	user: one(users, { fields: [setups.userId], references: [users.id] }),
	files: many(setupFiles),
	setupTags: many(setupTags),
	setupTools: many(setupTools),
	stars: many(stars),
	comments: many(comments),
	activities: many(activities)
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
	setup: one(setups, { fields: [setupFiles.setupId], references: [setups.id] })
}));

export const setupTagsRelations = relations(setupTags, ({ one }) => ({
	setup: one(setups, { fields: [setupTags.setupId], references: [setups.id] }),
	tag: one(tags, { fields: [setupTags.tagId], references: [tags.id] })
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	setupTags: many(setupTags)
}));

export const setupToolsRelations = relations(setupTools, ({ one }) => ({
	setup: one(setups, { fields: [setupTools.setupId], references: [setups.id] }),
	tool: one(tools, { fields: [setupTools.toolId], references: [tools.id] })
}));

export const toolsRelations = relations(tools, ({ many }) => ({
	setupTools: many(setupTools)
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
	setup: one(setups, { fields: [activities.setupId], references: [setups.id] })
}));

// ─── Type Exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

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

export type SetupTool = typeof setupTools.$inferSelect;
export type NewSetupTool = typeof setupTools.$inferInsert;

export type Star = typeof stars.$inferSelect;
export type NewStar = typeof stars.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
