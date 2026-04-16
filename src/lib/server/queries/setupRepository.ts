import {
	getSetupByOwnerSlug,
	getSetupById,
	getSetupFiles,
	getSetupTags,
	getSetupAgents,
	isSetupStarredByUser,
	getAllAgents,
	getAllTags,
	createSetup,
	updateSetup,
	deleteSetup,
	setStar,
	recordClone,
	searchSetups,
	getAllAgentsWithSetupCount,
	getAgentBySlugWithSetups,
	getSlugRedirect
} from '$lib/server/queries/setups';
import { getTeamSetupBySlug } from '$lib/server/queries/teams';
import { canViewSetup } from '$lib/server/queries/access';

export type SetupListItem = NonNullable<Awaited<ReturnType<typeof getSetupByOwnerSlug>>>;

export type SetupDetail = SetupListItem & {
	files: Awaited<ReturnType<typeof getSetupFiles>>;
	tags: Awaited<ReturnType<typeof getSetupTags>>;
	agents: Awaited<ReturnType<typeof getSetupAgents>>;
	isStarred: boolean;
};

export type TeamSetupBase = NonNullable<Awaited<ReturnType<typeof getTeamSetupBySlug>>>;

export type TeamSetupDetail = TeamSetupBase & {
	files: Awaited<ReturnType<typeof getSetupFiles>>;
	tags: Awaited<ReturnType<typeof getSetupTags>>;
	agents: Awaited<ReturnType<typeof getSetupAgents>>;
	isStarred: boolean;
};

export const setupRepo = {
	async getDetail(
		ownerUsername: string,
		slug: string,
		viewerId?: string | null
	): Promise<SetupDetail | null> {
		const setup = await getSetupByOwnerSlug(ownerUsername, slug);
		if (!setup) return null;

		if (!(await canViewSetup(setup, viewerId))) return null;

		const [files, tags, agents, isStarred] = await Promise.all([
			getSetupFiles(setup.id),
			getSetupTags(setup.id),
			getSetupAgents(setup.id),
			viewerId ? isSetupStarredByUser(setup.id, viewerId) : Promise.resolve(false)
		]);

		return { ...setup, files, tags, agents, isStarred };
	},

	async getByOwnerSlug(
		ownerUsername: string,
		slug: string,
		viewerId?: string | null
	): Promise<SetupListItem | null> {
		const setup = await getSetupByOwnerSlug(ownerUsername, slug);
		if (!setup) return null;
		if (!(await canViewSetup(setup, viewerId))) return null;
		return setup;
	},

	async getById(id: string, viewerId?: string | null) {
		const setup = await getSetupById(id);
		if (!setup) return null;
		if (!(await canViewSetup(setup, viewerId))) return null;
		return setup;
	},

	async getFiles(setupId: string) {
		return getSetupFiles(setupId);
	},

	async search(filters: Parameters<typeof searchSetups>[0]) {
		return searchSetups(filters);
	},

	async create(userId: string, data: Parameters<typeof createSetup>[1]) {
		return createSetup(userId, data);
	},

	async update(id: string, data: Parameters<typeof updateSetup>[1]) {
		return updateSetup(id, data);
	},

	async remove(id: string, userId: string) {
		return deleteSetup(id, userId);
	},

	async setStar(
		userId: string,
		setupId: string,
		desired: boolean
	): Promise<{ starred: boolean; starsCount: number }> {
		return setStar(userId, setupId, desired);
	},

	async recordClone(setupId: string): Promise<void> {
		return recordClone(setupId);
	},

	async getAllAgents() {
		return getAllAgents();
	},

	async getAllTags() {
		return getAllTags();
	},

	async getAllAgentsWithSetupCount() {
		return getAllAgentsWithSetupCount();
	},

	async getAgentBySlug(slug: string) {
		return getAgentBySlugWithSetups(slug);
	},

	async getSlugRedirect(ownerUsername: string, oldSlug: string): Promise<string | null> {
		return getSlugRedirect(ownerUsername, oldSlug);
	},

	async getTeamSetupDetail(
		teamSlug: string,
		setupSlug: string,
		viewerId?: string | null
	): Promise<TeamSetupDetail | null> {
		const setup = await getTeamSetupBySlug(teamSlug, setupSlug);
		if (!setup) return null;

		if (!(await canViewSetup(setup, viewerId))) return null;

		const [files, tags, agents, isStarred] = await Promise.all([
			getSetupFiles(setup.id),
			getSetupTags(setup.id),
			getSetupAgents(setup.id),
			viewerId ? isSetupStarredByUser(setup.id, viewerId) : Promise.resolve(false)
		]);

		return { ...setup, files, tags, agents, isStarred };
	}
};
