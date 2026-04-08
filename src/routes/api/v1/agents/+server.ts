import type { RequestHandler } from './$types';
import { success } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const GET: RequestHandler = async () => {
	const agentsList = await setupRepo.getAllAgentsWithSetupCount();
	return success(agentsList);
};
