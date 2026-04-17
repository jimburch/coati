import type { PageServerLoad } from './$types';
import { getInviteByToken, isInviteValid } from '$lib/server/queries/teams';

export const load: PageServerLoad = async (event) => {
	const invite = await getInviteByToken(event.params.token);

	if (!invite) {
		return { invite: null, valid: false, user: event.locals.user ?? null };
	}

	const valid = isInviteValid(invite);

	return {
		invite,
		valid,
		user: event.locals.user ?? null
	};
};
