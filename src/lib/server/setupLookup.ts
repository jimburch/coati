/**
 * Resolving a Setup path for the API (spec §5 "Redirects", #400). A renamed
 * slug still resolves: GET endpoints answer 301 to the canonical path, and
 * POST/PATCH endpoints use the Setup directly. Redirects are keyed by owner:
 * the user for personal Setups, the Team for Team Setups. A redirect is only
 * followed to a Setup the viewer can see, so it never reveals a private slug.
 */

import {
	setupRepo,
	type SetupListItem,
	type TeamSetupBase
} from '$lib/server/queries/setupRepository';
import { getSlugRedirect, getTeamSlugRedirect } from '$lib/server/queries/setups';
import { getTeamSetupBySlug } from '$lib/server/queries/teams';
import { canViewSetup } from '$lib/server/queries/access';

export type Resolved<T> = { setup: T; renamed: boolean };

export async function resolvePersonalSetup(
	owner: string,
	slug: string,
	viewerId?: string | null
): Promise<Resolved<SetupListItem> | null> {
	const direct = await setupRepo.getByOwnerSlug(owner, slug, viewerId);
	if (direct) return { setup: direct, renamed: false };
	const current = await getSlugRedirect(owner, slug);
	if (!current) return null;
	const setup = await setupRepo.getByOwnerSlug(owner, current, viewerId);
	return setup ? { setup, renamed: true } : null;
}

async function viewableTeamSetup(teamSlug: string, slug: string, viewerId?: string | null) {
	const setup = await getTeamSetupBySlug(teamSlug, slug);
	return setup && (await canViewSetup(setup, viewerId)) ? setup : null;
}

export async function resolveTeamSetup(
	teamSlug: string,
	slug: string,
	viewerId?: string | null
): Promise<Resolved<TeamSetupBase> | null> {
	const direct = await viewableTeamSetup(teamSlug, slug, viewerId);
	if (direct) return { setup: direct, renamed: false };
	const current = await getTeamSlugRedirect(teamSlug, slug);
	if (!current) return null;
	const setup = await viewableTeamSetup(teamSlug, current, viewerId);
	return setup ? { setup, renamed: true } : null;
}

/**
 * 301 to the same endpoint under the current slug. `base` is the path up to
 * and including the slug segment being replaced, e.g. `/api/v1/setups/alice/old`.
 */
export function movedPermanently(url: URL, base: string, canonicalBase: string): Response {
	const rest = url.pathname.slice(base.length);
	return new Response(null, {
		status: 301,
		headers: { Location: `${canonicalBase}${rest}${url.search}` }
	});
}
