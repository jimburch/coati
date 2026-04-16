import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAgentBySlugWithSetups, getAgentsForSetups } from '$lib/server/queries/setups';

export const load: PageServerLoad = async ({ params }) => {
	const data = await getAgentBySlugWithSetups(params.slug);
	if (!data) {
		error(404, 'Agent not found');
	}

	const { setups: rawSetups, ...agent } = data;

	// getAgentBySlugWithSetups returns agents as slug strings; fetch full objects for SetupCard
	const agentsMap = await getAgentsForSetups(rawSetups.map((s) => s.id));

	const setups = rawSetups.map((s) => ({
		id: s.id,
		name: s.name,
		slug: s.slug,
		description: s.description,
		display: s.display,
		starsCount: s.starsCount,
		clonesCount: s.clonesCount,
		updatedAt: new Date(s.updatedAt),
		ownerUsername: s.ownerUsername,
		ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
		agents: agentsMap[s.id] ?? []
	}));

	return { agent, setups };
};
