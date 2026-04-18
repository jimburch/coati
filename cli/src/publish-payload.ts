import type { Manifest } from './manifest.js';

export interface TeamInfo {
	id: string;
	name: string;
	slug: string;
}

export interface PublishFileContent {
	path: string;
	componentType: string;
	description?: string;
	agent?: string;
	content: string;
}

export interface PublishPayload {
	name: string;
	slug: string;
	description: string;
	display?: string;
	category?: string;
	license?: string;
	minToolVersion?: string;
	visibility?: 'public' | 'private';
	teamId?: string;
	files: PublishFileContent[];
}

export class OrgNotFoundError extends Error {
	readonly slug: string;

	constructor(slug: string) {
		super(`You are not a member of team \`${slug}\``);
		this.name = 'OrgNotFoundError';
		this.slug = slug;
	}
}

/**
 * Build the POST/PATCH payload for publishing a setup.
 * - Resolves manifest.org → teamId via slug lookup in teamsList
 * - Forces visibility: 'private' when teamId is set, regardless of manifest.visibility
 * - Throws OrgNotFoundError when manifest.org is set but doesn't match any team
 */
export function buildPublishPayload(
	manifest: Manifest,
	teamsList: TeamInfo[],
	fileContents: PublishFileContent[]
): PublishPayload {
	let teamId: string | undefined;

	if (manifest.org) {
		const team = teamsList.find((t) => t.slug === manifest.org);
		if (!team) {
			throw new OrgNotFoundError(manifest.org);
		}
		teamId = team.id;
	}

	const visibility = teamId ? 'private' : manifest.visibility;

	return {
		name: manifest.name,
		slug: manifest.name,
		description: manifest.description,
		...(manifest.display ? { display: manifest.display } : {}),
		...(manifest.category ? { category: manifest.category } : {}),
		...(manifest.license ? { license: manifest.license } : {}),
		...(manifest.minToolVersion ? { minToolVersion: manifest.minToolVersion } : {}),
		...(visibility ? { visibility } : {}),
		...(teamId ? { teamId } : {}),
		files: fileContents
	};
}
