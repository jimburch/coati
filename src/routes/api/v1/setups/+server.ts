import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createSetupWithFilesSchema } from '$lib/types';
import type { ExploreSort } from '$lib/types';
import { setupRepo } from '$lib/server/queries/setupRepository';

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

	try {
		const setup = await setupRepo.create(user.id, parsed);
		return success(setup, 201);
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
