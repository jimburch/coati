import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { updateSetupSchema } from '$lib/types';
import {
	getSetupByIdWithOwner,
	updateSetupByIdWithSlugRedirects
} from '$lib/server/queries/setups';

export const PATCH: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByIdWithOwner(event.params.id);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (setup.userId !== user.id) {
		return error('You do not own this setup', 'FORBIDDEN', 403);
	}

	const parsed = await parseRequestBody(event.request, updateSetupSchema);
	if (parsed instanceof Response) return parsed;

	try {
		const updated = await updateSetupByIdWithSlugRedirects(event.params.id, parsed, {
			userId: user.id,
			currentSlug: setup.slug
		});
		return success({ ...updated, ownerUsername: setup.ownerUsername });
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
