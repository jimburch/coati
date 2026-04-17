import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { updateSetupSchema } from '$lib/types';
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

export const GET: RequestHandler = async ({ params, locals }) => {
	const setup = await setupRepo.getByOwnerSlug(params.owner, params.slug, locals.user?.id);
	if (!setup) {
		const currentSlug = await setupRepo.getSlugRedirect(params.owner, params.slug);
		if (currentSlug) {
			return new Response(null, {
				status: 301,
				headers: { Location: `/api/v1/setups/${params.owner}/${currentSlug}` }
			});
		}
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	return success(setup);
};

export const PATCH: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug, user.id);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (!(await canMutateSetup(setup, user.id))) {
		return error('You do not have permission to edit this setup', 'FORBIDDEN', 403);
	}

	const parsed = await parseRequestBody(event.request, updateSetupSchema);
	if (parsed instanceof Response) return parsed;

	try {
		const updated = await setupRepo.update(setup.id, parsed);
		return success(updated);
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
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
