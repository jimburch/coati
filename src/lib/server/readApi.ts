/**
 * Response bodies shared by the personal and Team read endpoints (spec §5):
 * Setup extras, the files body and clone recording.
 */

import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { success } from '$lib/server/responses';
import { getSetupTagNames } from '$lib/server/queries/publish';
import { getLatestRevisionInfo, getSetupFilesWithHistory } from '$lib/server/queries/revisions';
import { anonCloneKey, recordSetupClone } from '$lib/server/queries/clones';
import { track } from '$lib/server/observability/mixpanel';

/** What the Setup GET adds on top of the row: latest Revision and tag names (#391, #400). */
export async function setupReadExtras(setupId: string) {
	const [latest, tags] = await Promise.all([
		getLatestRevisionInfo(setupId),
		getSetupTagNames(db, setupId)
	]);
	return {
		revision: latest?.revision ?? 0,
		revisionPublishedAt: latest?.revisionPublishedAt ?? null,
		tags
	};
}

export async function filesResponse(setupId: string): Promise<Response> {
	return success(await getSetupFilesWithHistory(setupId));
}

/**
 * Records a clone and answers `{ firstClone, clonesCount }`. Signed-in callers
 * are counted by user. Anonymous callers (who can only reach public Setups)
 * are counted by a daily key over their IP. Without `CLONE_SALT_SECRET` an
 * anonymous clone isn't recorded, so a missing secret can't fail a clone.
 */
export async function cloneResponse(
	event: RequestEvent,
	setup: { id: string; clonesCount: number }
): Promise<Response> {
	const user = event.locals.user;
	let result: { firstClone: boolean; clonesCount: number };
	if (user) {
		result = await recordSetupClone(setup.id, { userId: user.id });
	} else if (env.CLONE_SALT_SECRET) {
		const anonKey = await anonCloneKey(env.CLONE_SALT_SECRET, event.getClientAddress());
		result = await recordSetupClone(setup.id, { anonKey });
	} else {
		console.warn('CLONE_SALT_SECRET is not set; anonymous clone not recorded');
		result = { firstClone: false, clonesCount: setup.clonesCount };
	}

	track(
		'Setup Cloned',
		{ setup_id: setup.id, first_clone: result.firstClone },
		{
			locals: event.locals
		}
	);
	return success(result);
}
