import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createTeamSchema } from '$lib/types';
import { createTeam, getUserTeams } from '$lib/server/queries/teams';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const teams = await getUserTeams(user.id);
	return success({ teams, hasBetaFeatures: user.hasBetaFeatures });
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
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
