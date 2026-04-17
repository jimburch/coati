import type { RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { success } from '$lib/server/responses';
import { getAllTeamsWithAdminDetails } from '$lib/server/queries/admin';

export const GET: RequestHandler = async (event) => {
	const authResult = requireAdmin(event);
	if (authResult instanceof Response) return authResult;

	const search = event.url.searchParams.get('q') || undefined;
	const teams = await getAllTeamsWithAdminDetails(search);
	return success({ teams });
};
