import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createSetupWithFilesSchema } from '$lib/types';
import type { ExploreSort } from '$lib/types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { getTeamByIdForAuth, getTeamMemberRole } from '$lib/server/queries/teams';
import { getSetupSummary, publishErrorResponse } from '$lib/server/publishApi';
import { requireCliVersion } from '$lib/server/cliVersion';
import {
	PublishError,
	resolveClassification,
	validatePublishFiles
} from '$lib/server/publishValidation';

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
	const outdated = requireCliVersion(event.request);
	if (outdated) return outdated;

	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const parsed = await parseRequestBody(event.request, createSetupWithFilesSchema);
	if (parsed instanceof Response) return parsed;

	if (parsed.teamId) {
		const team = await getTeamByIdForAuth(parsed.teamId);
		if (!team) {
			return error('Team not found', 'NOT_FOUND', 404);
		}

		const role = await getTeamMemberRole(team.id, user.id);
		if (!role) {
			return error('You are not a member of this team', 'FORBIDDEN', 403);
		}
	}

	try {
		validatePublishFiles(parsed.files);
		const files = parsed.files.map((f) => ({ ...f, ...resolveClassification(f) }));
		// Team Setups start private (Decided #16); visibility changes need a Team Admin.
		const setup = await setupRepo.create(user.id, {
			...parsed,
			...(parsed.teamId && { visibility: 'private' as const }),
			files
		});
		return success(
			{
				setup: await getSetupSummary(setup.id, event.url.origin),
				revision: 1,
				revisionCreated: true,
				changes: { added: files.map((f) => f.path), updated: [], removed: [] },
				metadataUpdated: []
			},
			201
		);
	} catch (err: unknown) {
		if (err instanceof PublishError) return publishErrorResponse(err);
		if (isUniqueViolation(err)) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
