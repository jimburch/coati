import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { highlightCode } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const detail = await setupRepo.getTeamSetupDetail(
		params.teamSlug,
		params.setupSlug,
		locals.user?.id
	);
	if (!detail) throw error(404, 'Setup not found');

	const { files } = detail;
	if (files.length === 0) throw error(404, 'No files found');

	const selectedPath = url.searchParams.get('file') ?? files[0].path;
	const selectedFile = files.find((f) => f.path === selectedPath) ?? files[0];

	const highlightedHtml = await highlightCode(selectedFile.content, selectedFile.path);

	return {
		setup: detail,
		files,
		selectedFile,
		highlightedHtml
	};
};
