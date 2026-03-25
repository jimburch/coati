import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getAgentBySlugWithSetups } from '$lib/server/queries/setups';

export const GET: RequestHandler = async ({ params }) => {
	const agent = await getAgentBySlugWithSetups(params.slug);
	if (!agent) {
		return error('Agent not found', 'NOT_FOUND', 404);
	}
	return success(agent);
};
