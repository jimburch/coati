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
	getAgentBySlugWithSetups
} from '$lib/server/queries/setups';

export type SetupListItem = NonNullable<Awaited<ReturnType<typeof getSetupByOwnerSlug>>>;

export type SetupDetail = SetupListItem & {
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

		const [files, tags, agents, isStarred] = await Promise.all([
			getSetupFiles(setup.id),
			getSetupTags(setup.id),
			getSetupAgents(setup.id),
			viewerId ? isSetupStarredByUser(setup.id, viewerId) : Promise.resolve(false)
		]);

		return { ...setup, files, tags, agents, isStarred };
	},

	async getByOwnerSlug(ownerUsername: string, slug: string) {
		return getSetupByOwnerSlug(ownerUsername, slug);
	},

	async getById(id: string) {
		return getSetupById(id);
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
	}
};
