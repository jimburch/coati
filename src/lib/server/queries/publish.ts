/**
 * Publish writes (spec §5): Revisions, update-by-path, tags by name and the
 * derived `setup_agents`. `createSetup` in `setups.ts` uses the helpers here
 * for Revision 1; `publishSetupUpdate` is the PATCH transaction.
 */

import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	agents,
	setupAgents,
	setupFiles,
	setupRevisionFiles,
	setupRevisions,
	setups,
	setupTags,
	tags
} from '$lib/server/db/schema';
import { hashSetupFile } from '@coati/content-hash';
import { MAX_TAGS, normalizeTags, type Category } from '@coati/validation';
import {
	PublishError,
	resolveClassification,
	type PublishFileInput
} from '$lib/server/publishValidation';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FileChanges = { added: string[]; updated: string[]; removed: string[] };

/** A file with its server-computed hash (spec §3). The client's hash is never used. */
export type HashedFile = PublishFileInput & { hash: string };

export async function hashFiles<T extends { path: string; content: string }>(
	files: readonly T[]
): Promise<(T & { hash: string })[]> {
	return Promise.all(
		files.map(async (f) => ({ ...f, hash: await hashSetupFile(f.path, f.content) }))
	);
}

/** Normalizes tag names and enforces the 10-tag cap (`VALIDATION_ERROR`). */
export function normalizeTagInput(raw: readonly string[]): string[] {
	const names = normalizeTags(raw);
	if (names.length > MAX_TAGS) {
		throw new PublishError(`A setup can have at most ${MAX_TAGS} tags`, 'VALIDATION_ERROR', 400);
	}
	return names;
}

export async function getLatestRevision(
	tx: Tx,
	setupId: string
): Promise<{ id: string; number: number } | null> {
	const [row] = await tx
		.select({ id: setupRevisions.id, number: setupRevisions.number })
		.from(setupRevisions)
		.where(eq(setupRevisions.setupId, setupId))
		.orderBy(desc(setupRevisions.number))
		.limit(1);
	return row ?? null;
}

/** Inserts Revision `number` with its full path/hash set. */
export async function insertRevision(
	tx: Tx,
	setupId: string,
	number: number,
	files: readonly { path: string; hash: string }[],
	meta: { fingerprint?: string | null; publishedBy: string }
): Promise<void> {
	const [revision] = await tx
		.insert(setupRevisions)
		.values({
			setupId,
			number,
			repoFingerprint: meta.fingerprint ?? null,
			publishedBy: meta.publishedBy
		})
		.returning({ id: setupRevisions.id });
	if (files.length > 0) {
		await tx
			.insert(setupRevisionFiles)
			.values(files.map((f) => ({ revisionId: revision.id, setupId, path: f.path, hash: f.hash })));
	}
}

/** `setup_agents` is the distinct non-null `setup_files.agent` (spec §5 step 4). */
export async function syncSetupAgents(tx: Tx, setupId: string): Promise<void> {
	await tx.delete(setupAgents).where(eq(setupAgents.setupId, setupId));
	const used = await tx
		.selectDistinct({ id: agents.id })
		.from(setupFiles)
		.innerJoin(agents, eq(setupFiles.agent, agents.slug))
		.where(and(eq(setupFiles.setupId, setupId), isNotNull(setupFiles.agent)));
	if (used.length > 0) {
		await tx.insert(setupAgents).values(used.map((a) => ({ setupId, agentId: a.id })));
	}
}

/** Replaces a Setup's tags with `names` (already normalized), creating tags on first use. */
export async function replaceSetupTags(tx: Tx, setupId: string, names: readonly string[]) {
	await tx.delete(setupTags).where(eq(setupTags.setupId, setupId));
	if (names.length === 0) return;
	await tx
		.insert(tags)
		.values(names.map((name) => ({ name })))
		.onConflictDoNothing({ target: tags.name });
	const rows = await tx
		.select({ id: tags.id })
		.from(tags)
		.where(inArray(tags.name, [...names]));
	await tx.insert(setupTags).values(rows.map((t) => ({ setupId, tagId: t.id })));
}

export async function getSetupTagNames(tx: Tx | typeof db, setupId: string): Promise<string[]> {
	const rows = await tx
		.select({ name: tags.name })
		.from(setupTags)
		.innerJoin(tags, eq(setupTags.tagId, tags.id))
		.where(eq(setupTags.setupId, setupId))
		.orderBy(asc(tags.name));
	return rows.map((r) => r.name);
}

/** Setup Metadata a PATCH can carry. Present fields are applied; lists replace the whole list. */
export type SetupMetadataPatch = {
	description?: string;
	display?: string | null;
	category?: Category | null;
	tags?: string[];
	license?: string | null;
	postInstall?: string[] | null;
	prerequisites?: string[] | null;
	visibility?: 'public' | 'private';
};

export type PublishUpdateInput = {
	baseRevision: number;
	fingerprint?: string;
	/** The complete desired file set. Omitted means a metadata-only update. */
	files?: PublishFileInput[];
	metadata: SetupMetadataPatch;
};

export type PublishUpdateResult = {
	revision: number;
	revisionCreated: boolean;
	changes: FileChanges;
	metadataUpdated: string[];
};

const SCALAR_METADATA = [
	'description',
	'display',
	'category',
	'license',
	'postInstall',
	'prerequisites',
	'visibility'
] as const satisfies readonly (keyof SetupMetadataPatch)[];

function sameValue(a: unknown, b: unknown): boolean {
	return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * The PATCH transaction (spec §5 "Publish: update"). Locks the Setup row, checks
 * `baseRevision`, diffs the full file set against the latest Revision and
 * applies the three Revision rules (#391):
 *
 * - files differ: Revision n+1 with the full set, and `setup_files` updated by path
 * - same files from a fingerprint none of this Setup's Revisions has: Revision n+1
 * - otherwise: no Revision
 *
 * New paths take the client's Classification (validated); existing paths keep
 * theirs. Metadata never creates a Revision. Throws `PublishError`.
 */
export async function publishSetupUpdate(
	setupId: string,
	actorId: string,
	input: PublishUpdateInput
): Promise<PublishUpdateResult> {
	const incoming = input.files ? await hashFiles(input.files) : undefined;
	const tagNames = input.metadata.tags ? normalizeTagInput(input.metadata.tags) : undefined;

	return db.transaction(async (tx) => {
		const [setup] = await tx.select().from(setups).where(eq(setups.id, setupId)).for('update');
		if (!setup) throw new PublishError('Setup not found', 'NOT_FOUND', 404);

		const latest = await getLatestRevision(tx, setupId);
		const latestNumber = latest?.number ?? 0;
		if (latestNumber !== input.baseRevision) {
			throw new PublishError(
				`This setup is at Revision ${latestNumber}, not ${input.baseRevision}`,
				'REVISION_CONFLICT',
				409,
				{ data: null, latestRevision: latestNumber }
			);
		}

		const changes: FileChanges = { added: [], updated: [], removed: [] };
		let revision = latestNumber;
		let revisionCreated = false;

		if (incoming) {
			const published = latest
				? await tx
						.select({ path: setupRevisionFiles.path, hash: setupRevisionFiles.hash })
						.from(setupRevisionFiles)
						.where(eq(setupRevisionFiles.revisionId, latest.id))
				: [];
			const publishedHash = new Map(published.map((f) => [f.path, f.hash]));
			const incomingPaths = new Set(incoming.map((f) => f.path));
			for (const f of incoming) {
				const prev = publishedHash.get(f.path);
				if (prev === undefined) changes.added.push(f.path);
				else if (prev !== f.hash) changes.updated.push(f.path);
			}
			for (const path of publishedHash.keys()) {
				if (!incomingPaths.has(path)) changes.removed.push(path);
			}
			const filesDiffer =
				changes.added.length + changes.updated.length + changes.removed.length > 0;

			let linksRepo = false;
			if (!filesDiffer && input.fingerprint) {
				const [known] = await tx
					.select({ id: setupRevisions.id })
					.from(setupRevisions)
					.where(
						and(
							eq(setupRevisions.setupId, setupId),
							eq(setupRevisions.repoFingerprint, input.fingerprint)
						)
					)
					.limit(1);
				linksRepo = !known;
			}

			if (filesDiffer) {
				await applyFileDiff(tx, setupId, incoming);
				await syncSetupAgents(tx, setupId);
			}
			if (filesDiffer || linksRepo) {
				revision = latestNumber + 1;
				revisionCreated = true;
				await insertRevision(tx, setupId, revision, incoming, {
					fingerprint: input.fingerprint,
					publishedBy: actorId
				});
			}
		}

		const metadataUpdated: string[] = [];
		const fields: Partial<typeof setups.$inferInsert> = {};
		for (const key of SCALAR_METADATA) {
			const value = input.metadata[key];
			if (value === undefined || sameValue(value, setup[key])) continue;
			Object.assign(fields, { [key]: value });
			metadataUpdated.push(key);
		}
		if (tagNames) {
			const current = await getSetupTagNames(tx, setupId);
			if (!sameValue([...tagNames].sort(), current)) {
				await replaceSetupTags(tx, setupId, tagNames);
				metadataUpdated.push('tags');
			}
		}

		if (revisionCreated || metadataUpdated.length > 0) {
			await tx
				.update(setups)
				.set({ ...fields, updatedAt: new Date() })
				.where(eq(setups.id, setupId));
		}

		return { revision, revisionCreated, changes, metadataUpdated };
	});
}

/**
 * Brings `setup_files` to the incoming set by path. New paths get a validated
 * Classification; changed paths get new content and hash only (#400); gone
 * paths are deleted, so a path added back later is classified afresh.
 */
async function applyFileDiff(tx: Tx, setupId: string, incoming: readonly HashedFile[]) {
	const current = await tx
		.select({ path: setupFiles.path, hash: setupFiles.hash })
		.from(setupFiles)
		.where(eq(setupFiles.setupId, setupId));
	const currentHash = new Map(current.map((f) => [f.path, f.hash]));
	const incomingPaths = new Set(incoming.map((f) => f.path));

	const removed = current.filter((f) => !incomingPaths.has(f.path)).map((f) => f.path);
	if (removed.length > 0) {
		await tx
			.delete(setupFiles)
			.where(and(eq(setupFiles.setupId, setupId), inArray(setupFiles.path, removed)));
	}

	const added = incoming.filter((f) => !currentHash.has(f.path));
	if (added.length > 0) {
		await tx.insert(setupFiles).values(
			added.map((f) => ({
				setupId,
				path: f.path,
				content: f.content,
				hash: f.hash,
				...resolveClassification(f)
			}))
		);
	}

	for (const f of incoming) {
		const prev = currentHash.get(f.path);
		if (prev !== undefined && prev !== f.hash) {
			await tx
				.update(setupFiles)
				.set({ content: f.content, hash: f.hash })
				.where(and(eq(setupFiles.setupId, setupId), eq(setupFiles.path, f.path)));
		}
	}
}
