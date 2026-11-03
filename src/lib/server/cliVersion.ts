/**
 * The CLI version gate (spec §5 "CLI version check"). Publish, match, files and
 * clone answer an old or unknown CLI with 426 `CLI_OUTDATED`, because older
 * CLIs can't read the manifest-less API.
 */

import { error } from '$lib/server/responses';

/** The oldest CLI the server accepts (Decided #23). */
export const MIN_CLI_VERSION = '1.0.0';

export const CLI_VERSION_HEADER = 'X-Coati-CLI';

export const CLI_OUTDATED_MESSAGE =
	'This version of coati is no longer supported. Run npm i -g @coati/sh@latest';

/** `[major, minor, patch]`, or null when `version` doesn't start with `x.y.z`. */
function parseVersion(version: string): [number, number, number] | null {
	const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * True when `version` is at least `MIN_CLI_VERSION`. A pre-release of the
 * minimum (`1.0.0-beta.1`) counts as the minimum, so release candidates work.
 */
export function isSupportedCliVersion(version: string | null): boolean {
	if (!version) return false;
	const v = parseVersion(version);
	const min = parseVersion(MIN_CLI_VERSION)!;
	if (!v) return false;
	for (let i = 0; i < 3; i++) {
		if (v[i] !== min[i]) return v[i] > min[i];
	}
	return true;
}

/** A 426 response for an old or missing `X-Coati-CLI` header, or null to carry on. */
export function requireCliVersion(request: Request): Response | null {
	if (isSupportedCliVersion(request.headers.get(CLI_VERSION_HEADER))) return null;
	return error(CLI_OUTDATED_MESSAGE, 'CLI_OUTDATED', 426);
}
