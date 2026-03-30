import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { setStar, getSetupByOwnerSlug, isSetupStarredByUser } from '$lib/server/queries/setups';
import {
	createComment,
	deleteComment,
	InvalidParentError,
	ForbiddenError
} from '$lib/server/queries/comments';
import { createReport } from '$lib/server/queries/reports';
import { renderMarkdown } from '$lib/server/markdown';
import { createCommentSchema, createReportSchema } from '$lib/types';
import { isUniqueViolation } from '$lib/server/responses';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await setupRepo.getDetail(params.username, params.slug, locals.user?.id);
	if (!detail) throw error(404, 'Setup not found');

	const { files } = detail;

	// Use readme column if set, otherwise look for README.md file
	const readmeContent =
		detail.readme ??
		files.find((f) => {
			const source = f.source.toLowerCase();
			return source === 'readme.md' || source === 'readme';
		})?.content ??
		null;

	const readmeHtml = readmeContent ? await renderMarkdown(readmeContent) : null;

	return {
		setup: detail,
		files,
		tags: detail.tags,
		agents: detail.agents,
		readmeHtml,
		isStarred: detail.isStarred,
		user: locals.user ?? null
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
	},

	report: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		const formData = await request.formData();
		const raw = {
			reason: formData.get('reason'),
			description: formData.get('description') || undefined
		};

		const parsed = createReportSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { error: 'Invalid report' });
		}

		try {
			await createReport(setup.id, locals.user.id, parsed.data.reason, parsed.data.description);
		} catch (e) {
			if (isUniqueViolation(e)) {
				return fail(409, {
					error: 'You have already reported this setup',
					code: 'DUPLICATE_REPORT'
				});
			}
			throw e;
		}

		return { reportSuccess: true };
	}
};
