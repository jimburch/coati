export function setupsPath(owner: string, slug: string): string {
	return `/setups/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`;
}

export function teamSetupsPath(teamSlug: string, setupSlug: string): string {
	return `/teams/${encodeURIComponent(teamSlug)}/setups/${encodeURIComponent(setupSlug)}`;
}
