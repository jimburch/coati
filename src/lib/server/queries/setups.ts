import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups, setupFiles, users } from '$lib/server/db/schema';
import type { z } from 'zod';
import type { createSetupWithFilesSchema, updateSetupSchema } from '$lib/types';

type CreateSetupInput = z.infer<typeof createSetupWithFilesSchema>;
type UpdateSetupInput = z.infer<typeof updateSetupSchema>;

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
			await tx.insert(setupFiles).values(
				data.files.map((f) => ({
					setupId: setup.id,
					source: f.source,
					target: f.target,
					placement: f.placement,
					description: f.description,
					content: f.content
				}))
			);
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
		const updateFields: Record<string, unknown> = {};
		if (data.name !== undefined) updateFields.name = data.name;
		if (data.slug !== undefined) updateFields.slug = data.slug;
		if (data.description !== undefined) updateFields.description = data.description;
		if (data.version !== undefined) updateFields.version = data.version;
		if (data.readmePath !== undefined) updateFields.readmePath = data.readmePath;

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
				await tx.insert(setupFiles).values(
					data.files.map((f) => ({
						setupId: id,
						source: f.source,
						target: f.target,
						placement: f.placement,
						description: f.description,
						content: f.content
					}))
				);
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
