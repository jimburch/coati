import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const GET: RequestHandler = async ({ params }) => {
	const agent = await setupRepo.getAgentBySlug(params.slug);
	if (!agent) {
		return error('Agent not found', 'NOT_FOUND', 404);
	}
	return success(agent);
};
