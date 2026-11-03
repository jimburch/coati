import type { RequestHandler } from './$types';
import { error } from '$lib/server/responses';
import { requireCliVersion } from '$lib/server/cliVersion';
import { resolvePersonalSetup } from '$lib/server/setupLookup';
import { cloneResponse } from '$lib/server/readApi';

/** Records a clone (spec §5 "Clone"). A renamed slug resolves without a redirect. */
export const POST: RequestHandler = async (event) => {
	const outdated = requireCliVersion(event.request);
	if (outdated) return outdated;

	const found = await resolvePersonalSetup(
		event.params.owner,
		event.params.slug,
		event.locals.user?.id
	);
	if (!found) return error('Setup not found', 'NOT_FOUND', 404);
	return cloneResponse(event, found.setup);
};
