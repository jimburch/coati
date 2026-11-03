import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { handleSetupUpdate } from '$lib/server/publishApi';
import { requireCliVersion } from '$lib/server/cliVersion';
import { movedPermanently, resolvePersonalSetup } from '$lib/server/setupLookup';
import { setupReadExtras } from '$lib/server/readApi';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { getTeamMemberRole } from '$lib/server/queries/teams';
import { deleteSetupForce } from '$lib/server/queries/setups';

async function canMutateSetup(
	setup: { userId: string; teamId: string | null },
	actorId: string
): Promise<boolean> {
	if (setup.userId === actorId) return true;
	if (!setup.teamId) return false;
	const role = await getTeamMemberRole(setup.teamId, actorId);
	return role === 'admin';
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const found = await resolvePersonalSetup(params.owner, params.slug, locals.user?.id);
	if (!found) return error('Setup not found', 'NOT_FOUND', 404);
	if (found.renamed) {
		return movedPermanently(
			url,
			`/api/v1/setups/${params.owner}/${params.slug}`,
			`/api/v1/setups/${params.owner}/${found.setup.slug}`
		);
	}
	return success({ ...found.setup, ...(await setupReadExtras(found.setup.id)) });
};

/** Same handler as `PATCH /api/v1/setups/[id]`. */
export const PATCH: RequestHandler = async (event) => {
	const outdated = requireCliVersion(event.request);
	if (outdated) return outdated;
	const user = event.locals.user;
	const found = user
		? await resolvePersonalSetup(event.params.owner, event.params.slug, user.id)
		: null;
	return handleSetupUpdate(event, found?.setup ?? null);
};

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug, user.id);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (!(await canMutateSetup(setup, user.id))) {
		return error('You do not have permission to delete this setup', 'FORBIDDEN', 403);
	}

	if (setup.userId === user.id) {
		await setupRepo.remove(setup.id, user.id);
	} else {
		// Team admin deleting another member's setup
		await deleteSetupForce(setup.id, setup.userId);
	}
	return success({ deleted: true });
};
