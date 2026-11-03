import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { parseRequestBody, success } from '$lib/server/responses';
import { requireCliVersion } from '$lib/server/cliVersion';
import { matchSetupsSchema } from '$lib/types';
import { findFingerprintMatches, findOverlaps } from '$lib/server/queries/match';
import { getSetupSummaries } from '$lib/server/publishApi';

/**
 * Finds the caller's Setups a Local copy belongs to (spec §5 "Match"): every
 * Setup with a Revision from this Repo fingerprint, or, when there are none,
 * the top overlaps by `(path, hash)` against each Setup's latest Revision.
 */
export const POST: RequestHandler = async (event) => {
	const outdated = requireCliVersion(event.request);
	if (outdated) return outdated;

	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const parsed = await parseRequestBody(event.request, matchSetupsSchema);
	if (parsed instanceof Response) return parsed;

	const origin = event.url.origin;
	const fingerprintIds = parsed.fingerprint
		? await findFingerprintMatches(user.id, parsed.fingerprint)
		: [];
	const fingerprintMatches = await getSetupSummaries(fingerprintIds, origin);

	let overlap: Array<
		Awaited<ReturnType<typeof getSetupSummaries>>[number] & {
			matched: number;
			total: number;
		}
	> = [];
	if (fingerprintMatches.length === 0) {
		const counts = await findOverlaps(user.id, parsed.files);
		const summaries = await getSetupSummaries(
			counts.map((c) => c.setupId),
			origin
		);
		const countById = new Map(counts.map((c) => [c.setupId, c]));
		overlap = summaries.map((s) => {
			const { matched, total } = countById.get(s.id)!;
			return { ...s, matched, total };
		});
	}

	return success({ fingerprintMatches, overlap });
};
