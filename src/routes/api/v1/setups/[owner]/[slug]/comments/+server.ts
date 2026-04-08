import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { getSetupComments, createComment, InvalidParentError } from '$lib/server/queries/comments';
import { createCommentSchema } from '$lib/types';

export const GET: RequestHandler = async (event) => {
	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const commentList = await getSetupComments(setup.id);
	return success(commentList);
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const body = await parseRequestBody(event.request, createCommentSchema);
	if (body instanceof Response) return body;

	let comment: { id: string };
	try {
		comment = await createComment(setup.id, user.id, body.body, body.parentId);
	} catch (err) {
		if (err instanceof InvalidParentError) {
			return error(err.message, err.code, 400);
		}
		throw err;
	}

	const updated = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	return success({ comment, commentsCount: updated!.commentsCount }, 201);
};
