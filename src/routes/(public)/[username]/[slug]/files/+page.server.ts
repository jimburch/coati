import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSetupByOwnerSlug, getSetupFiles } from '$lib/server/queries/setups';
import { highlightCode } from '$lib/server/markdown';

export const load: PageServerLoad = async ({ params, url }) => {
	const setup = await getSetupByOwnerSlug(params.username, params.slug);
	if (!setup) throw error(404, 'Setup not found');

	const files = await getSetupFiles(setup.id);
	if (files.length === 0) throw error(404, 'No files found');

	const selectedPath = url.searchParams.get('file') ?? files[0].source;
	const selectedFile = files.find((f) => f.source === selectedPath) ?? files[0];

	const highlightedHtml = await highlightCode(selectedFile.content, selectedFile.source);

	return {
		setup,
		files,
		selectedFile,
		highlightedHtml
	};
};
