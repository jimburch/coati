import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import {
	setStar,
	getSetupByOwnerSlug,
	isSetupStarredByUser,
	setFeatured,
	deleteSetup
} from '$lib/server/queries/setups';
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
	if (!detail) {
		const currentSlug = await setupRepo.getSlugRedirect(params.username, params.slug);
		if (currentSlug) throw redirect(301, `/${params.username}/${currentSlug}`);
		throw error(404, 'Setup not found');
	}

	const { files } = detail;

	const readmeHtml = detail.readme ? await renderMarkdown(detail.readme) : null;

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
	saveReadme: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const detail = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!detail) throw error(404, 'Setup not found');
		if (detail.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const readmeRaw = String(formData.get('readme') ?? '');
		const readme = readmeRaw.trim() === '' ? null : readmeRaw;

		const updated = await setupRepo.update(detail.id, { readme });
		const readmeHtml = updated.readme ? await renderMarkdown(updated.readme) : null;

		return { readmeHtml, updatedAt: updated.updatedAt };
	},

	saveAbout: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const detail = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!detail) throw error(404, 'Setup not found');
		if (detail.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const displayRaw = formData.get('display');
		const descriptionRaw = formData.get('description');

		const display = typeof displayRaw === 'string' ? displayRaw.trim() : '';
		const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() : '';

		if (!display) {
			return fail(400, { error: 'Display name is required', code: 'INVALID_DISPLAY' });
		}
		if (display.length > 150) {
			return fail(400, {
				error: 'Display name must be 150 characters or fewer',
				code: 'INVALID_DISPLAY'
			});
		}
		if (description.length > 300) {
			return fail(400, {
				error: 'Description must be 300 characters or fewer',
				code: 'INVALID_DESCRIPTION'
			});
		}

		const updated = await setupRepo.update(detail.id, { display, description });
		return { display: updated.display, description: updated.description };
	},

	previewReadme: async ({ request }) => {
		const formData = await request.formData();
		const readme = String(formData.get('readme') ?? '');

		const previewHtml = readme ? await renderMarkdown(readme) : null;
		return { previewHtml };
	},

	star: async ({ locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		if (setup.visibility === 'private') {
			return fail(403, { error: 'Cannot star a private setup', code: 'FORBIDDEN' });
		}

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

	feature: async ({ locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');
		if (!locals.user.isAdmin) {
			return fail(403, { error: 'Admin access required', code: 'FORBIDDEN' });
		}

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		const nowFeatured = !setup.featuredAt;
		await setFeatured(setup.id, nowFeatured);
		return { featured: nowFeatured };
	},

	delete: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		if (setup.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const slugConfirmation = String(formData.get('slug') ?? '');
		if (slugConfirmation !== setup.slug) {
			return fail(400, { error: 'Slug confirmation does not match', code: 'SLUG_MISMATCH' });
		}

		await deleteSetup(setup.id, locals.user.id);
		throw redirect(303, `/${params.username}?deleted=${encodeURIComponent(setup.name)}`);
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
