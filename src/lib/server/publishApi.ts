/**
 * Request handling shared by the publish endpoints (spec §5): the
 * `SetupSummary` shape, Team permissions, `PublishError` → JSON, and the one
 * PATCH handler behind `PATCH /api/v1/setups/[id]` and `…/[owner]/[slug]`.
 */

import type { RequestEvent } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups, teams, users } from '$lib/server/db/schema';
import { requireApiAuth } from '$lib/server/guards';
import { error, parseRequestBody, success } from '$lib/server/responses';
import { updateSetupSchema } from '$lib/types';
import { getTeamByIdForAuth, getTeamMemberRole } from '$lib/server/queries/teams';
import { publishSetupUpdate } from '$lib/server/queries/publish';
import { PublishError, validatePublishFiles } from '$lib/server/publishValidation';

export type SetupSummary = {
	id: string;
	slug: string;
	/** `owner/slug`, or `org/team/slug` for a Team Setup. */
	path: string;
	display: string | null;
	description: string;
	visibility: 'public' | 'private';
	teamSlug: string | null;
	ownerUsername: string;
	url: string;
};

export function buildSetupSummary(
	row: {
		id: string;
		slug: string;
		display: string | null;
		description: string;
		visibility: 'public' | 'private';
		teamSlug: string | null;
		ownerUsername: string;
	},
	origin: string
): SetupSummary {
	const path = row.teamSlug
		? `org/${row.teamSlug}/${row.slug}`
		: `${row.ownerUsername}/${row.slug}`;
	return { ...row, path, url: `${origin}/${path}` };
}

/** Summaries for `setupIds`, in the order given. Unknown ids are skipped. */
export async function getSetupSummaries(
	setupIds: readonly string[],
	origin: string
): Promise<SetupSummary[]> {
	if (setupIds.length === 0) return [];
	const rows = await db
		.select({
			id: setups.id,
			slug: setups.slug,
			display: setups.display,
			description: setups.description,
			visibility: setups.visibility,
			teamSlug: teams.slug,
			ownerUsername: users.username
		})
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.leftJoin(teams, eq(setups.teamId, teams.id))
		.where(inArray(setups.id, [...setupIds]));
	const byId = new Map(rows.map((r) => [r.id, buildSetupSummary(r, origin)]));
	return setupIds.flatMap((id) => byId.get(id) ?? []);
}

export async function getSetupSummary(setupId: string, origin: string): Promise<SetupSummary> {
	const [summary] = await getSetupSummaries([setupId], origin);
	return summary;
}

/**
 * What an actor may do to a Setup (#400). The owner of a personal Setup can do
 * everything. On a Team Setup any Team Member can publish and edit metadata,
 * and only a Team Admin or the Team's Owner can change visibility.
 */
export async function getSetupPermissions(
	setup: { userId: string; teamId: string | null },
	actorId: string
): Promise<{ canPublish: boolean; canAdminister: boolean }> {
	if (!setup.teamId) {
		const owner = setup.userId === actorId;
		return { canPublish: owner, canAdminister: owner };
	}
	const [role, team] = await Promise.all([
		getTeamMemberRole(setup.teamId, actorId),
		getTeamByIdForAuth(setup.teamId)
	]);
	return {
		canPublish: role !== null,
		canAdminister: role === 'admin' || team?.ownerId === actorId
	};
}

export function publishErrorResponse(err: PublishError): Response {
	return new Response(JSON.stringify({ ...err.extra, error: err.message, code: err.code }), {
		status: err.status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * `PATCH` for both update routes. The caller resolves which Setup the URL means;
 * this checks permissions, validates the body and runs the publish transaction.
 */
export async function handleSetupUpdate(
	event: RequestEvent,
	setup: { id: string; userId: string; teamId: string | null; visibility: string } | null
): Promise<Response> {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	if (!setup) return error('Setup not found', 'NOT_FOUND', 404);

	const { canPublish, canAdminister } = await getSetupPermissions(setup, user.id);
	if (!canPublish) {
		return error('You do not have permission to publish to this setup', 'FORBIDDEN', 403);
	}

	const parsed = await parseRequestBody(event.request, updateSetupSchema);
	if (parsed instanceof Response) return parsed;

	if (parsed.visibility !== undefined && parsed.visibility !== setup.visibility && !canAdminister) {
		return error('Only a Team Admin or the Team Owner can change visibility', 'FORBIDDEN', 403);
	}

	const { baseRevision, fingerprint, files, ...metadata } = parsed;
	try {
		if (files) validatePublishFiles(files);
		const result = await publishSetupUpdate(setup.id, user.id, {
			baseRevision,
			fingerprint,
			files,
			metadata
		});
		return success({ setup: await getSetupSummary(setup.id, event.url.origin), ...result });
	} catch (err) {
		if (err instanceof PublishError) return publishErrorResponse(err);
		throw err;
	}
}
