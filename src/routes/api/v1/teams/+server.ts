import type { RequestHandler } from './$types';
import { requireBetaFeatures } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createTeamSchema } from '$lib/types';
import { createTeam } from '$lib/server/queries/teams';

export const POST: RequestHandler = async (event) => {
	const authResult = requireBetaFeatures(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const parsed = await parseRequestBody(event.request, createTeamSchema);
	if (parsed instanceof Response) return parsed;

	try {
		const team = await createTeam(user.id, parsed);
		return success(team, 201);
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('A team with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
