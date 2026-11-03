import type { RequestHandler } from './$types';
import { error } from '$lib/server/responses';
import { requireCliVersion } from '$lib/server/cliVersion';
import { resolveTeamSetup } from '$lib/server/setupLookup';
import { cloneResponse } from '$lib/server/readApi';

/** Records a clone of a Team Setup. A renamed slug resolves without a redirect. */
export const POST: RequestHandler = async (event) => {
	const outdated = requireCliVersion(event.request);
	if (outdated) return outdated;

	const found = await resolveTeamSetup(
		event.params.slug,
		event.params.setupSlug,
		event.locals.user?.id
	);
	if (!found) return error('Setup not found', 'NOT_FOUND', 404);
	return cloneResponse(event, found.setup);
};
