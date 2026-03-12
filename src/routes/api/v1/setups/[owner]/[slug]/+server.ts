import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { updateSetupSchema } from '$lib/types';
import { getSetupByOwnerSlug, updateSetup, deleteSetup } from '$lib/server/queries/setups';

export const GET: RequestHandler = async ({ params }) => {
	const setup = await getSetupByOwnerSlug(params.owner, params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	return success(setup);
};

export const PATCH: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (setup.userId !== user.id) {
		return error('You do not own this setup', 'FORBIDDEN', 403);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error('Invalid JSON', 'INVALID_JSON', 400);
	}

	const parsed = updateSetupSchema.safeParse(body);
	if (!parsed.success) {
		return error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
	}

	try {
		const updated = await updateSetup(setup.id, parsed.data);
		return success(updated);
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

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (setup.userId !== user.id) {
		return error('You do not own this setup', 'FORBIDDEN', 403);
	}

	await deleteSetup(setup.id, user.id);
	return success({ deleted: true });
};
