import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getSetupByOwnerSlug,
	getSetupFiles,
	getSetupTags,
	getSetupTools,
	isSetupStarredByUser,
	toggleStar
} from '$lib/server/queries/setups';
import { getSetupComments, createComment, InvalidParentError } from '$lib/server/queries/comments';
import { renderMarkdown } from '$lib/server/markdown';
import { createCommentSchema } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const setup = await getSetupByOwnerSlug(params.username, params.slug);
	if (!setup) throw error(404, 'Setup not found');

	const [files, setupTags, setupTools, comments] = await Promise.all([
		getSetupFiles(setup.id),
		getSetupTags(setup.id),
		getSetupTools(setup.id),
		getSetupComments(setup.id)
	]);

	// Find README file
	const readmePath = setup.readmePath?.toLowerCase();
	const readmeFile = files.find((f) => {
		const source = f.source.toLowerCase();
		if (readmePath && source === readmePath) return true;
		return source === 'readme.md' || source === 'readme';
	});

	const readmeHtml = readmeFile ? await renderMarkdown(readmeFile.content) : null;

	const isStarred = locals.user ? await isSetupStarredByUser(setup.id, locals.user.id) : false;

	return {
		setup,
		files,
		tags: setupTags,
		tools: setupTools,
		readmeHtml,
		isStarred,
		comments
	};
};

export const actions: Actions = {
	star: async ({ locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await getSetupByOwnerSlug(params.username, params.slug);
		if (!setup) throw error(404, 'Setup not found');

		const newIsStarred = await toggleStar(locals.user.id, setup.id);
		const newStarsCount = newIsStarred ? setup.starsCount + 1 : setup.starsCount - 1;
		return { isStarred: newIsStarred, starsCount: newStarsCount };
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
	}
};
