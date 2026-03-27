import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { counters } from '$lib/server/counters';
import {
	setups,
	setupFiles,
	setupTags,
	setupAgents,
	tags,
	agents,
	stars,
	users,
	activities
} from '$lib/server/db/schema';
import type { z } from 'zod';
import type { createSetupWithFilesSchema, updateSetupSchema, ExploreSort } from '$lib/types';

type CreateSetupInput = z.infer<typeof createSetupWithFilesSchema>;
type UpdateSetupInput = z.infer<typeof updateSetupSchema>;
type FileInput = CreateSetupInput['files'];

function toSetupFileRows(setupId: string, files: NonNullable<FileInput>) {
	return files.map((f) => ({
		setupId,
		source: f.source,
		target: f.target,
		placement: f.placement,
		componentType: f.componentType,
		description: f.description,
		content: f.content
	}));
}

export async function getSetupsByUserId(userId: string) {
	return db.select().from(setups).where(eq(setups.userId, userId)).orderBy(desc(setups.createdAt));
}

export async function getSetupByOwnerSlug(ownerUsername: string, slug: string) {
	const result = await db
		.select({
			id: setups.id,
			userId: setups.userId,
			name: setups.name,
			slug: setups.slug,
			version: setups.version,
			description: setups.description,
			readmePath: setups.readmePath,
			category: setups.category,
			license: setups.license,
			minToolVersion: setups.minToolVersion,
			postInstall: setups.postInstall,
			prerequisites: setups.prerequisites,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			commentsCount: setups.commentsCount,
			createdAt: setups.createdAt,
			updatedAt: setups.updatedAt,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.where(and(eq(users.username, ownerUsername), eq(setups.slug, slug)))
		.limit(1);

	return result[0] ?? null;
}

export async function getSetupById(id: string) {
	const result = await db.select().from(setups).where(eq(setups.id, id)).limit(1);
	return result[0] ?? null;
}

export async function createSetup(userId: string, data: CreateSetupInput) {
	return db.transaction(async (tx) => {
		const [setup] = await tx
			.insert(setups)
			.values({
				userId,
				name: data.name,
				slug: data.slug,
				version: data.version,
				description: data.description,
				readmePath: data.readmePath,
				category: data.category,
				license: data.license,
				minToolVersion: data.minToolVersion,
				postInstall: data.postInstall,
				prerequisites: data.prerequisites
			})
			.returning();

		if (data.files && data.files.length > 0) {
			await tx.insert(setupFiles).values(toSetupFileRows(setup.id, data.files));
		}

		if (data.agentIds && data.agentIds.length > 0) {
			await tx
				.insert(setupAgents)
				.values(data.agentIds.map((agentId) => ({ setupId: setup.id, agentId })));
		}

		if (data.tagIds && data.tagIds.length > 0) {
			await tx.insert(setupTags).values(data.tagIds.map((tagId) => ({ setupId: setup.id, tagId })));
		}

		await counters.setupCreated(tx, userId);

		await tx.insert(activities).values({ userId, setupId: setup.id, actionType: 'created_setup' });

		return setup;
	});
}

export async function updateSetup(id: string, data: UpdateSetupInput) {
	return db.transaction(async (tx) => {
		const updateFields = {
			...(data.name !== undefined && { name: data.name }),
			...(data.slug !== undefined && { slug: data.slug }),
			...(data.description !== undefined && { description: data.description }),
			...(data.version !== undefined && { version: data.version }),
			...(data.readmePath !== undefined && { readmePath: data.readmePath }),
			...(data.category !== undefined && { category: data.category }),
			...(data.license !== undefined && { license: data.license }),
			...(data.minToolVersion !== undefined && { minToolVersion: data.minToolVersion }),
			...(data.postInstall !== undefined && { postInstall: data.postInstall }),
			...(data.prerequisites !== undefined && { prerequisites: data.prerequisites })
		};

		let setup;
		if (Object.keys(updateFields).length > 0) {
			const [updated] = await tx
				.update(setups)
				.set(updateFields)
				.where(eq(setups.id, id))
				.returning();
			setup = updated;
		} else {
			const [existing] = await tx.select().from(setups).where(eq(setups.id, id));
			setup = existing;
		}

		if (data.files !== undefined) {
			await tx.delete(setupFiles).where(eq(setupFiles.setupId, id));
			if (data.files.length > 0) {
				await tx.insert(setupFiles).values(toSetupFileRows(id, data.files));
			}
		}

		return setup;
	});
}

export async function deleteSetup(id: string, userId: string) {
	return db.transaction(async (tx) => {
		const deleted = await tx
			.delete(setups)
			.where(and(eq(setups.id, id), eq(setups.userId, userId)))
			.returning();

		if (deleted.length > 0) {
			await counters.setupDeleted(tx, userId);
		}

		return deleted.length;
	});
}

export async function getSetupFiles(setupId: string) {
	return db
		.select()
		.from(setupFiles)
		.where(eq(setupFiles.setupId, setupId))
		.orderBy(setupFiles.source);
}

export async function getSetupTags(setupId: string) {
	return db
		.select({ id: tags.id, name: tags.name })
		.from(setupTags)
		.innerJoin(tags, eq(setupTags.tagId, tags.id))
		.where(eq(setupTags.setupId, setupId));
}

export async function getSetupAgents(setupId: string) {
	return db
		.select({ id: agents.id, displayName: agents.displayName, slug: agents.slug })
		.from(setupAgents)
		.innerJoin(agents, eq(setupAgents.agentId, agents.id))
		.where(eq(setupAgents.setupId, setupId));
}

export async function isSetupStarredByUser(setupId: string, userId: string) {
	const result = await db
		.select({ id: stars.id })
		.from(stars)
		.where(and(eq(stars.setupId, setupId), eq(stars.userId, userId)))
		.limit(1);
	return result.length > 0;
}

export async function setStar(
	userId: string,
	setupId: string,
	desired: boolean
): Promise<{ starred: boolean; starsCount: number }> {
	return db.transaction(async (tx) => {
		const existing = await tx
			.select({ id: stars.id })
			.from(stars)
			.where(and(eq(stars.userId, userId), eq(stars.setupId, setupId)))
			.limit(1);

		const alreadyStarred = existing.length > 0;

		if (desired === alreadyStarred) {
			const [setupRow] = await tx
				.select({ starsCount: setups.starsCount })
				.from(setups)
				.where(eq(setups.id, setupId));
			return { starred: alreadyStarred, starsCount: setupRow.starsCount };
		}

		if (desired) {
			await tx.insert(stars).values({ userId, setupId });
			await counters.star(tx, setupId, true);
			await tx.insert(activities).values({ userId, setupId, actionType: 'starred_setup' });
		} else {
			await tx.delete(stars).where(eq(stars.id, existing[0].id));
			await counters.star(tx, setupId, false);
		}

		const [updated] = await tx
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setupId));

		return { starred: desired, starsCount: updated.starsCount };
	});
}

export async function getRecentSetups(limit = 12) {
	return db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.orderBy(desc(setups.createdAt))
		.limit(limit);
}

export async function getAllAgents() {
	return db.select().from(agents).orderBy(agents.displayName);
}

export async function getAllAgentsWithSetupCount() {
	return db
		.select({
			id: agents.id,
			slug: agents.slug,
			displayName: agents.displayName,
			icon: agents.icon,
			website: agents.website,
			official: agents.official,
			setupsCount: sql<number>`count(${setupAgents.setupId})::int`
		})
		.from(agents)
		.leftJoin(setupAgents, eq(agents.id, setupAgents.agentId))
		.groupBy(agents.id)
		.orderBy(agents.displayName);
}

export async function getAgentBySlugWithSetups(slug: string) {
	const agentRows = await db.select().from(agents).where(eq(agents.slug, slug)).limit(1);
	if (!agentRows[0]) return null;
	const agent = agentRows[0];

	const setupRows = await db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt,
			ownerUsername: users.username,
			ownerAvatarUrl: users.avatarUrl
		})
		.from(setupAgents)
		.innerJoin(setups, eq(setupAgents.setupId, setups.id))
		.innerJoin(users, eq(setups.userId, users.id))
		.where(eq(setupAgents.agentId, agent.id))
		.orderBy(desc(setups.createdAt));

	const setupIds = setupRows.map((s) => s.id);
	const agentsMap = await getAgentsForSetups(setupIds);

	return {
		...agent,
		setupsCount: setupRows.length,
		setups: setupRows.map((s) => ({
			...s,
			agents: (agentsMap[s.id] ?? []).map((a) => a.slug)
		}))
	};
}

export async function getAllTags() {
	return db.select().from(tags).orderBy(tags.name);
}

const PAGE_SIZE = 12;

export async function searchSetups(filters: {
	q?: string;
	agentSlugs?: string[];
	tagName?: string;
	sort: ExploreSort;
	page: number;
}) {
	const { q, agentSlugs, tagName, sort, page } = filters;
	const offset = (page - 1) * PAGE_SIZE;

	const conditions: ReturnType<typeof sql>[] = [];

	if (q) {
		conditions.push(sql`${setups}.search_vector @@ websearch_to_tsquery('english', ${q})`);
	}

	if (agentSlugs && agentSlugs.length > 0) {
		conditions.push(
			sql`${setups.id} IN (
				SELECT ${setupAgents.setupId} FROM ${setupAgents}
				INNER JOIN ${agents} ON ${setupAgents.agentId} = ${agents.id}
				WHERE ${agents.slug} IN (${sql.join(
					agentSlugs.map((s) => sql`${s}`),
					sql`, `
				)})
			)`
		);
	}

	if (tagName) {
		conditions.push(
			sql`${setups.id} IN (
				SELECT ${setupTags.setupId} FROM ${setupTags}
				INNER JOIN ${tags} ON ${setupTags.tagId} = ${tags.id}
				WHERE ${tags.name} = ${tagName}
			)`
		);
	}

	const whereClause =
		conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

	let orderClause: ReturnType<typeof sql>;
	if (q && sort === 'newest') {
		orderClause = sql`ORDER BY ts_rank(${setups}.search_vector, websearch_to_tsquery('english', ${q})) DESC, ${setups.createdAt} DESC`;
	} else if (sort === 'stars') {
		orderClause = sql`ORDER BY ${setups.starsCount} DESC, ${setups.createdAt} DESC`;
	} else if (sort === 'clones') {
		orderClause = sql`ORDER BY ${setups.clonesCount} DESC, ${setups.createdAt} DESC`;
	} else if (sort === 'trending') {
		orderClause = sql`ORDER BY (
			SELECT COUNT(*) FROM ${stars}
			WHERE ${stars.setupId} = ${setups.id}
			AND ${stars.createdAt} > NOW() - INTERVAL '7 days'
		) DESC, ${setups.createdAt} DESC`;
	} else {
		orderClause = sql`ORDER BY ${setups.createdAt} DESC`;
	}

	const [items, countResult] = await Promise.all([
		db.execute<{
			id: string;
			name: string;
			slug: string;
			description: string;
			stars_count: number;
			clones_count: number;
			updated_at: Date;
			owner_username: string;
			owner_avatar_url: string;
		}>(
			sql`SELECT ${setups.id}, ${setups.name}, ${setups.slug}, ${setups.description},
				${setups.starsCount}, ${setups.clonesCount}, ${setups.updatedAt},
				${users.username} AS owner_username, ${users.avatarUrl} AS owner_avatar_url
				FROM ${setups}
				INNER JOIN ${users} ON ${setups.userId} = ${users.id}
				${whereClause}
				${orderClause}
				LIMIT ${PAGE_SIZE} OFFSET ${offset}`
		),
		db.execute<{ count: string }>(
			sql`SELECT COUNT(*) AS count FROM ${setups}
				INNER JOIN ${users} ON ${setups.userId} = ${users.id}
				${whereClause}`
		)
	]);

	const total = Number(countResult[0].count);

	const setupIds = items.map((row) => row.id);
	const agentsMap = await getAgentsForSetups(setupIds);

	return {
		items: items.map((row) => ({
			id: row.id,
			name: row.name,
			slug: row.slug,
			description: row.description,
			starsCount: row.stars_count,
			clonesCount: row.clones_count,
			updatedAt: new Date(row.updated_at),
			ownerUsername: row.owner_username,
			ownerAvatarUrl: row.owner_avatar_url,
			agents: (agentsMap[row.id] ?? []).map((a) => a.slug)
		})),
		total,
		page,
		pageSize: PAGE_SIZE,
		totalPages: Math.ceil(total / PAGE_SIZE)
	};
}

export async function recordClone(setupId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await counters.cloneRecorded(tx, setupId);
	});
}

export async function getAgentsForSetups(setupIds: string[]) {
	if (setupIds.length === 0) return {};

	const rows = await db
		.select({
			setupId: setupAgents.setupId,
			id: agents.id,
			displayName: agents.displayName,
			slug: agents.slug
		})
		.from(setupAgents)
		.innerJoin(agents, eq(setupAgents.agentId, agents.id))
		.where(inArray(setupAgents.setupId, setupIds));

	const map: Record<string, { id: string; displayName: string; slug: string }[]> = {};
	for (const row of rows) {
		if (!map[row.setupId]) map[row.setupId] = [];
		map[row.setupId].push({ id: row.id, displayName: row.displayName, slug: row.slug });
	}
	return map;
}
