import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { setFeatured } from '$lib/server/queries/setups';
import { setupRepo } from '$lib/server/queries/setupRepository';

const featuredSchema = z.object({
	featured: z.boolean()
});

export const POST: RequestHandler = async (event) => {
	const authResult = requireAdmin(event);
	if (authResult instanceof Response) return authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const body = await parseRequestBody(event.request, featuredSchema);
	if (body instanceof Response) return body;

	await setFeatured(setup.id, body.featured);

	return success({
		featured: body.featured,
		featuredAt: body.featured ? new Date().toISOString() : null
	});
};
