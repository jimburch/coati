export function formatEmbedSnippet(setupUrl: string): string {
	const badgeUrl = `${setupUrl}/badge.svg`;
	return [
		'Add this badge to your README to let others clone your setup:',
		'',
		`  [![Clone on Coati](${badgeUrl})](${setupUrl})`
	].join('\n');
}
