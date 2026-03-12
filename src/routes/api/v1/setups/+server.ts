import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { createSetupWithFilesSchema } from '$lib/types';
import { createSetup } from '$lib/server/queries/setups';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error('Invalid JSON', 'INVALID_JSON', 400);
	}

	const parsed = createSetupWithFilesSchema.safeParse(body);
	if (!parsed.success) {
		return error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
	}

	try {
		const setup = await createSetup(user.id, parsed.data);
		return success(setup, 201);
	} catch (err: unknown) {
		if (
			typeof err === 'object' &&
			err !== null &&
			'code' in err &&
			(err as { code: string }).code === '23505'
		) {
			return error('A setup with this slug already exists', 'SLUG_TAKEN', 409);
		}
		throw err;
	}
};
