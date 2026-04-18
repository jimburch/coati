import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createShareSchema } from '$lib/types';
import { getSetupByIdWithOwner } from '$lib/server/queries/setups';
import { getUserByUsername } from '$lib/server/queries/users';
import { shareSetup, getSetupShares } from '$lib/server/queries/setupShares';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByIdWithOwner(event.params.id);
	if (!setup) return error('Setup not found', 'NOT_FOUND', 404);
	if (setup.userId !== user.id) return error('You do not own this setup', 'FORBIDDEN', 403);

	const shares = await getSetupShares(setup.id);
	return success(shares);
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByIdWithOwner(event.params.id);
	if (!setup) return error('Setup not found', 'NOT_FOUND', 404);
	if (setup.userId !== user.id) return error('You do not own this setup', 'FORBIDDEN', 403);
	if (setup.visibility !== 'private') {
		return error('Can only share private setups', 'INVALID_VISIBILITY', 400);
	}

	const parsed = await parseRequestBody(event.request, createShareSchema);
	if (parsed instanceof Response) return parsed;

	const target = await getUserByUsername(parsed.username);
	if (!target) return error('User not found', 'NOT_FOUND', 404);
	if (target.id === user.id) return error('Cannot share with yourself', 'INVALID_TARGET', 400);

	try {
		const share = await shareSetup(setup.id, user.id, target.id);
		return success(share, 201);
	} catch (err: unknown) {
		if (isUniqueViolation(err)) {
			return error('Setup already shared with this user', 'ALREADY_SHARED', 409);
		}
		throw err;
	}
};
