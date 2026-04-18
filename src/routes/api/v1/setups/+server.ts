import type { RequestHandler } from './$types';
import { requireApiAuth, requireBetaFeatures } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createSetupWithFilesSchema } from '$lib/types';
import type { ExploreSort } from '$lib/types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { getTeamByIdForAuth, getTeamMemberRole } from '$lib/server/queries/teams';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q') ?? undefined;
	const agentSlugs = url.searchParams.getAll('agent').filter(Boolean);
	const sort = (url.searchParams.get('sort') as ExploreSort) || 'newest';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));

	const result = await setupRepo.search({
		q,
		agentSlugs: agentSlugs.length > 0 ? agentSlugs : undefined,
		sort,
		page
	});
	return success(result);
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const parsed = await parseRequestBody(event.request, createSetupWithFilesSchema);
	if (parsed instanceof Response) return parsed;

	if (parsed.teamId) {
		const betaResult = requireBetaFeatures(event);
		if (betaResult instanceof Response) return betaResult;

		const team = await getTeamByIdForAuth(parsed.teamId);
		if (!team) {
			return error('Team not found', 'NOT_FOUND', 404);
		}

		const role = await getTeamMemberRole(team.id, user.id);
		if (!role) {
			return error('You are not a member of this team', 'FORBIDDEN', 403);
		}
	}

	// Server refinement: team setups are always private regardless of payload
	const createData = parsed.teamId ? { ...parsed, visibility: 'private' as const } : parsed;

	try {
		const setup = await setupRepo.create(user.id, createData);
		return success(setup, 201);
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
