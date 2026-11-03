import type { RequestHandler } from './$types';
import { getSetupById } from '$lib/server/queries/setups';
import { handleSetupUpdate } from '$lib/server/publishApi';

/** Publish update by id (spec §5). The CLI addresses updates by id, so renames don't matter. */
export const PATCH: RequestHandler = async (event) =>
	handleSetupUpdate(event, await getSetupById(event.params.id));
