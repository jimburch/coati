import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	getSetupByOwnerSlug,
	getSetupFiles,
	getSetupTags,
	getSetupTools,
	isSetupStarredByUser,
	toggleStar
} from '$lib/server/queries/setups';
import { renderMarkdown } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, locals }) => {
	const setup = await getSetupByOwnerSlug(params.username, params.slug);
	if (!setup) throw error(404, 'Setup not found');

	const [files, setupTags, setupTools] = await Promise.all([
		getSetupFiles(setup.id),
		getSetupTags(setup.id),
		getSetupTools(setup.id)
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
		isStarred
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
	}
};
