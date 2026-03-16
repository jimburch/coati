import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	setups,
	setupFiles,
	setupTags,
	setupTools,
	tags,
	tools,
	stars,
	users
} from '$lib/server/db/schema';
import type { z } from 'zod';
import type { createSetupWithFilesSchema, updateSetupSchema } from '$lib/types';

type CreateSetupInput = z.infer<typeof createSetupWithFilesSchema>;
type UpdateSetupInput = z.infer<typeof updateSetupSchema>;
type FileInput = CreateSetupInput['files'];

function toSetupFileRows(setupId: string, files: NonNullable<FileInput>) {
	return files.map((f) => ({
		setupId,
		source: f.source,
		target: f.target,
		placement: f.placement,
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
				readmePath: data.readmePath
			})
			.returning();

		if (data.files && data.files.length > 0) {
			await tx.insert(setupFiles).values(toSetupFileRows(setup.id, data.files));
		}

		await tx
			.update(users)
			.set({ setupsCount: sql`${users.setupsCount} + 1` })
			.where(eq(users.id, userId));

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
			...(data.readmePath !== undefined && { readmePath: data.readmePath })
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
			await tx
				.update(users)
				.set({ setupsCount: sql`${users.setupsCount} - 1` })
				.where(eq(users.id, userId));
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

export async function getSetupTools(setupId: string) {
	return db
		.select({ id: tools.id, name: tools.name, slug: tools.slug })
		.from(setupTools)
		.innerJoin(tools, eq(setupTools.toolId, tools.id))
		.where(eq(setupTools.setupId, setupId));
}

export async function isSetupStarredByUser(setupId: string, userId: string) {
	const result = await db
		.select({ id: stars.id })
		.from(stars)
		.where(and(eq(stars.setupId, setupId), eq(stars.userId, userId)))
		.limit(1);
	return result.length > 0;
}

export async function toggleStar(userId: string, setupId: string) {
	return db.transaction(async (tx) => {
		const existing = await tx
			.select({ id: stars.id })
			.from(stars)
			.where(and(eq(stars.userId, userId), eq(stars.setupId, setupId)))
			.limit(1);

		if (existing.length > 0) {
			await tx.delete(stars).where(eq(stars.id, existing[0].id));
			await tx
				.update(setups)
				.set({ starsCount: sql`${setups.starsCount} - 1` })
				.where(eq(setups.id, setupId));
			return false;
		} else {
			await tx.insert(stars).values({ userId, setupId });
			await tx
				.update(setups)
				.set({ starsCount: sql`${setups.starsCount} + 1` })
				.where(eq(setups.id, setupId));
			return true;
		}
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
			ownerUsername: users.username
		})
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.orderBy(desc(setups.createdAt))
		.limit(limit);
}
