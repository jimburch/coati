import type { RequestHandler } from './$types';
import { success } from '$lib/server/responses';

export const GET: RequestHandler = async () => {
	return success({ status: 'ok', timestamp: new Date().toISOString() });
};
