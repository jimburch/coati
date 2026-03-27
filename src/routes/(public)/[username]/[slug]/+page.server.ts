import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { setStar, getSetupByOwnerSlug, isSetupStarredByUser } from '$lib/server/queries/setups';
import {
	getSetupComments,
	createComment,
	deleteComment,
	InvalidParentError,
	ForbiddenError
} from '$lib/server/queries/comments';
import { renderMarkdown } from '$lib/server/markdown';
import { createCommentSchema } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await setupRepo.getDetail(params.username, params.slug, locals.user?.id);
	if (!detail) throw error(404, 'Setup not found');

	const { files } = detail;

	// Find README file
	const readmePath = detail.readmePath?.toLowerCase();
	const readmeFile = files.find((f) => {
		const source = f.source.toLowerCase();
		if (readmePath && source === readmePath) return true;
		return source === 'readme.md' || source === 'readme';
	});

	const [readmeHtml, comments] = await Promise.all([
		readmeFile ? renderMarkdown(readmeFile.content) : Promise.resolve(null),
		getSetupComments(detail.id)
	]);

	return {
		setup: detail,
		files,
		tags: detail.tags,
		agents: detail.agents,
		readmeHtml,
		isStarred: detail.isStarred,
		comments
	};
};

export const actions: Actions = {
	star: async ({ locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		const currentIsStarred = await isSetupStarredByUser(setup.id, locals.user.id);
		const result = await setStar(locals.user.id, setup.id, !currentIsStarred);
		return { isStarred: result.starred, starsCount: result.starsCount };
	},

	comment: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		const formData = await request.formData();
		const raw = {
			body: formData.get('body'),
			parentId: formData.get('parentId') || undefined
		};

		const parsed = createCommentSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { error: 'Invalid comment' });
		}

		try {
			await createComment(setup.id, locals.user.id, parsed.data.body, parsed.data.parentId);
		} catch (e) {
			if (e instanceof InvalidParentError) {
				return fail(400, { error: 'Cannot reply to a reply', code: 'INVALID_PARENT' });
			}
			throw e;
		}

		return { success: true };
	},

	deleteComment: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const formData = await request.formData();
		const commentId = formData.get('commentId');
		if (typeof commentId !== 'string' || !commentId) {
			return fail(400, { error: 'Missing commentId', code: 'BAD_REQUEST' });
		}

		try {
			await deleteComment(commentId, locals.user.id);
		} catch (e) {
			if (e instanceof ForbiddenError) {
				return fail(403, { error: e.message, code: 'FORBIDDEN' });
			}
			throw e;
		}

		return { success: true };
	}
};
