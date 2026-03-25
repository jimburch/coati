import type { RequestHandler } from './$types';
import { success } from '$lib/server/responses';
import { getAllAgentsWithSetupCount } from '$lib/server/queries/setups';

export const GET: RequestHandler = async () => {
	const agentsList = await getAllAgentsWithSetupCount();
	return success(agentsList);
};
