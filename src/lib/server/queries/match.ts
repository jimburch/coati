/**
 * `POST /api/v1/setups/match` (spec §5 "Match", #390, #391): which of the
 * caller's Setups a Local copy belongs to. Candidates are the caller's personal
 * Setups and every Setup of a Team they're in.
 */

import { and, eq, exists, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setupRevisions, setups, teamMembers } from '$lib/server/db/schema';

/** Most overlap results returned. */
export const OVERLAP_LIMIT = 5;

function ownedBy(userId: string) {
	return or(
		and(isNull(setups.teamId), eq(setups.userId, userId)),
		inArray(
			setups.teamId,
			db.select({ id: teamMembers.teamId }).from(teamMembers).where(eq(teamMembers.userId, userId))
		)
	);
}

/** Ids of the caller's Setups where any Revision recorded `fingerprint`. */
export async function findFingerprintMatches(userId: string, fingerprint: string) {
	const rows = await db
		.select({ id: setups.id })
		.from(setups)
		.where(
			and(
				ownedBy(userId),
				exists(
					db
						.select({ one: sql`1` })
						.from(setupRevisions)
						.where(
							and(
								eq(setupRevisions.setupId, setups.id),
								eq(setupRevisions.repoFingerprint, fingerprint)
							)
						)
				)
			)
		)
		.orderBy(setups.createdAt);
	return rows.map((r) => r.id);
}

/**
 * The caller's Setups whose latest Revision shares at least one `(path, hash)`
 * with `files`: `matched` shared pairs out of `total` paths in that Revision.
 * Most matched first, then the closer fit (fewer paths), top `OVERLAP_LIMIT`.
 */
export async function findOverlaps(
	userId: string,
	files: readonly { path: string; hash: string }[]
): Promise<Array<{ setupId: string; matched: number; total: number }>> {
	if (files.length === 0) return [];
	const owned = await db.select({ id: setups.id }).from(setups).where(ownedBy(userId));
	if (owned.length === 0) return [];

	const incoming = sql.join(
		files.map((f) => sql`(${f.path}, ${f.hash})`),
		sql`, `
	);
	const ownedIds = sql.join(
		owned.map((s) => sql`${s.id}::uuid`),
		sql`, `
	);
	const rows = await db.execute<{ setup_id: string; matched: number; total: number }>(sql`
		WITH latest AS (
			SELECT DISTINCT ON (r.setup_id) r.id, r.setup_id
			FROM setup_revisions r
			WHERE r.setup_id IN (${ownedIds})
			ORDER BY r.setup_id, r.number DESC
		),
		incoming(path, hash) AS (VALUES ${incoming})
		SELECT l.setup_id,
			count(i.path)::int AS matched,
			count(*)::int AS total
		FROM latest l
		JOIN setup_revision_files f ON f.revision_id = l.id
		LEFT JOIN incoming i ON i.path = f.path AND i.hash = f.hash
		GROUP BY l.setup_id
		HAVING count(i.path) > 0
		ORDER BY matched DESC, total ASC, l.setup_id
		LIMIT ${OVERLAP_LIMIT}
	`);
	return rows.map((r) => ({ setupId: r.setup_id, matched: r.matched, total: r.total }));
}
