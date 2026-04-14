/**
 * Extracts the latest version number from CHANGELOG.md content.
 * Expects the first line to follow: # [X.Y.Z](url) (date)
 */
export function parseLatestVersion(changelog: string): string | null {
	const match = changelog.match(/^# \[(\d+\.\d+\.\d+)]/);
	return match ? match[1] : null;
}
