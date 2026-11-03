/**
 * Read side of Revisions (spec §5 "Files" and "Setup"): the latest Revision and
 * the per-path change log the CLI classifies against.
 */

import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setupFiles, setupRevisionFiles, setupRevisions } from '$lib/server/db/schema';

/** One path's change log: an entry per Revision where its hash changed; `null` means removed. */
export type PathHistory = Array<{ revision: number; hash: string | null }>;

export async function getLatestRevisionInfo(
	setupId: string
): Promise<{ revision: number; revisionPublishedAt: Date } | null> {
	const [row] = await db
		.select({ number: setupRevisions.number, createdAt: setupRevisions.createdAt })
		.from(setupRevisions)
		.where(eq(setupRevisions.setupId, setupId))
		.orderBy(desc(setupRevisions.number))
		.limit(1);
	return row ? { revision: row.number, revisionPublishedAt: row.createdAt } : null;
}

/**
 * Builds `history` from every Revision's full path set. Walks Revisions in
 * order and records a path whenever its hash differs from the last one seen:
 * added, changed, removed (`null`) or added back. Paths are in first-seen order.
 */
export function buildHistory(
	revisions: readonly number[],
	rows: readonly { revision: number; path: string; hash: string }[]
): Record<string, PathHistory> {
	const byRevision = new Map<number, Map<string, string>>();
	for (const n of revisions) byRevision.set(n, new Map());
	for (const r of rows) byRevision.get(r.revision)?.set(r.path, r.hash);

	const history: Record<string, PathHistory> = {};
	const last = new Map<string, string | null>();
	for (const n of [...revisions].sort((a, b) => a - b)) {
		const files = byRevision.get(n)!;
		for (const [path, hash] of files) {
			if (last.get(path) !== hash) {
				(history[path] ??= []).push({ revision: n, hash });
				last.set(path, hash);
			}
		}
		for (const [path, hash] of last) {
			if (hash !== null && !files.has(path)) {
				history[path].push({ revision: n, hash: null });
				last.set(path, null);
			}
		}
	}
	return history;
}

/** The files endpoint body: `{ revision, files[] with hash, history }`. */
export async function getSetupFilesWithHistory(setupId: string) {
	const [revisions, rows, files] = await Promise.all([
		db
			.select({ number: setupRevisions.number })
			.from(setupRevisions)
			.where(eq(setupRevisions.setupId, setupId)),
		db
			.select({
				revision: setupRevisions.number,
				path: setupRevisionFiles.path,
				hash: setupRevisionFiles.hash
			})
			.from(setupRevisionFiles)
			.innerJoin(setupRevisions, eq(setupRevisionFiles.revisionId, setupRevisions.id))
			.where(eq(setupRevisionFiles.setupId, setupId)),
		db
			.select({
				path: setupFiles.path,
				content: setupFiles.content,
				hash: setupFiles.hash,
				agent: setupFiles.agent,
				componentType: setupFiles.componentType,
				description: setupFiles.description
			})
			.from(setupFiles)
			.where(eq(setupFiles.setupId, setupId))
			.orderBy(asc(setupFiles.path))
	]);
	const numbers = revisions.map((r) => r.number);
	return {
		revision: numbers.length > 0 ? Math.max(...numbers) : 0,
		files,
		history: buildHistory(numbers, rows)
	};
}
