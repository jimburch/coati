import type { RequestHandler } from './$types';
import { error } from '$lib/server/responses';
import { requireCliVersion } from '$lib/server/cliVersion';
import { movedPermanently, resolveTeamSetup } from '$lib/server/setupLookup';
import { filesResponse } from '$lib/server/readApi';

/** `{ revision, files, history }` for a Team Setup. A renamed slug answers 301. */
export const GET: RequestHandler = async ({ params, locals, request, url }) => {
	const outdated = requireCliVersion(request);
	if (outdated) return outdated;

	const found = await resolveTeamSetup(params.slug, params.setupSlug, locals.user?.id);
	if (!found) return error('Setup not found', 'NOT_FOUND', 404);
	if (found.renamed) {
		return movedPermanently(
			url,
			`/api/v1/teams/${params.slug}/setups/${params.setupSlug}`,
			`/api/v1/teams/${params.slug}/setups/${found.setup.slug}`
		);
	}
	return filesResponse(found.setup.id);
};
