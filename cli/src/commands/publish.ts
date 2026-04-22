import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import { ApiError } from '../context.js';
import { readManifest, writeManifest, MANIFEST_FILENAME, type Manifest } from '../manifest.js';
import type { CommandContext } from '../context.js';
import { runInitFlow } from './init.js';
import { runLoginFlow } from './login.js';
import { confirm } from '../prompts.js';
import {
	buildPublishPayload,
	OrgNotFoundError,
	type TeamInfo,
	type PublishFileContent
} from '../publish-payload.js';
import { formatEmbedSnippet } from '../embed.js';

interface PublishOptions {
	json?: boolean;
}

/**
 * Validate agent references in the manifest:
 * 1. Every file's `agent` field must be a known slug in the registry.
 * 2. Every agent referenced in file entries must appear in `manifest.agents`.
 *
 * Blocking errors (unknown slug) cause the function to return null.
 * Fixable mismatches (agent missing from the agents array) prompt the user
 * to auto-fix; the updated manifest is returned.
 *
 * @param ctx       Command context (for io methods).
 * @param manifest  The in-memory manifest (may be mutated for auto-fix).
 * @param cwd       Project directory (used to persist auto-fixes to setup.json).
 * @returns The (possibly updated) manifest, or null if a blocking error occurred.
 */
export async function validateAgentRefs(
	ctx: CommandContext,
	manifest: Manifest,
	cwd: string
): Promise<Manifest | null> {
	const agentsInFiles = new Set<string>();
	const unknownSlugs: string[] = [];

	for (const file of manifest.files) {
		if (!file.agent) continue;
		const slug = file.agent;
		if (!AGENTS_BY_SLUG[slug]) {
			unknownSlugs.push(slug);
		} else {
			agentsInFiles.add(slug);
		}
	}

	// Block on unknown slugs
	if (unknownSlugs.length > 0) {
		for (const slug of unknownSlugs) {
			ctx.io.error(`Unknown agent slug "${slug}". Run \`coati agents\` to see valid slugs.`);
		}
		return null;
	}

	// Offer to auto-fix agents missing from the agents array
	const manifestAgents = new Set(manifest.agents ?? []);
	const missingSlugs = [...agentsInFiles].filter((slug) => !manifestAgents.has(slug));

	if (missingSlugs.length > 0 && !ctx.io.isJson()) {
		let changed = false;
		for (const slug of missingSlugs) {
			const filesForSlug = manifest.files
				.filter((f) => f.agent === slug)
				.map((f) => f.path)
				.join(', ');
			ctx.io.warning(
				`File(s) ${filesForSlug} reference agent "${slug}" but it's not in your agents list.`
			);
			const add = await ctx.io.confirm(`Add "${slug}" to agents list?`, true);
			if (add) {
				manifestAgents.add(slug);
				changed = true;
			}
		}
		if (changed) {
			manifest = { ...manifest, agents: [...manifestAgents] };
			writeManifest(cwd, manifest);
			ctx.io.info('Updated agents list in coati.json.');
		}
	}

	return manifest;
}

/**
 * Return a copy of the manifest with `id` inserted after `$schema` (if present)
 * and before `name`. This preserves the conventional field ordering in coati.json.
 */
function insertIdIntoManifest(manifest: Manifest, id: string): Manifest {
	const { $schema, ...rest } = manifest;
	if ($schema !== undefined) {
		return { $schema, id, ...rest };
	}
	return { id, ...rest };
}

interface SetupResponse {
	id: string;
	slug: string;
	name: string;
	ownerUsername: string;
}

/**
 * Fetch the user's teams from the API.
 * Returns an empty array on error.
 */
async function fetchTeams(ctx: CommandContext): Promise<TeamInfo[]> {
	try {
		const res = await ctx.api.get<{ teams: TeamInfo[]; hasBetaFeatures: boolean }>('/teams');
		return res?.teams ?? [];
	} catch {
		return [];
	}
}

/**
 * Prompt for org and/or visibility when visibility is absent from the manifest.
 * Persists chosen values back to coati.json and returns the updated manifest.
 */
async function promptAndPersistOrgVisibility(
	ctx: CommandContext,
	manifest: Manifest,
	teams: TeamInfo[],
	cwd: string
): Promise<Manifest> {
	// Manifest already has an org — org-owned setups are always private. Persist and return.
	if (manifest.org) {
		const updated = { ...manifest, visibility: 'private' as const };
		writeManifest(cwd, updated);
		return updated;
	}

	if (teams.length > 0) {
		const orgChoices: { label: string; value: string }[] = [
			{ label: 'My profile', value: '__personal__' },
			...teams.map((t) => ({ label: t.name, value: t.slug }))
		];
		const orgChoice = await ctx.io.select('Where does this setup live?', orgChoices);

		if (orgChoice !== '__personal__') {
			const updated = { ...manifest, org: orgChoice, visibility: 'private' as const };
			writeManifest(cwd, updated);
			return updated;
		}
	}

	// Personal or no teams — ask visibility
	const vis = await ctx.io.promptVisibility();
	const updated = { ...manifest, visibility: vis };
	writeManifest(cwd, updated);
	return updated;
}

export function registerPublish(program: Command, ctx: CommandContext): void {
	program
		.command('publish')
		.description('Publish or update a setup from the current directory')
		.option('--json', 'Output results as JSON')
		.action(async (opts: PublishOptions) => {
			if (opts.json) ctx.io.setOutputMode('json');

			const cwd = process.cwd();

			// Require authentication — offer to log in interactively
			if (!ctx.auth.isLoggedIn()) {
				if (ctx.io.isJson()) {
					ctx.io.error('Not logged in. Run `coati login` to authenticate.');
					process.exit(1);
					return;
				}

				ctx.io.warning('You are not logged in.');
				const shouldLogin = await confirm('Would you like to log in now?', true);
				if (!shouldLogin) {
					ctx.io.print('Run `coati login` when you are ready to authenticate.');
					process.exit(0);
					return;
				}

				await runLoginFlow(ctx);
			}

			const owner = ctx.fs.readConfig().username!;

			// Check for coati.json; auto-run init if absent
			const manifestPath = path.join(cwd, MANIFEST_FILENAME);
			if (!ctx.fs.existsSync(manifestPath)) {
				if (ctx.io.isJson()) {
					ctx.io.error('No coati.json found. Run `coati init` first.');
					process.exit(1);
					return;
				}
				ctx.io.info('No coati.json found. Running `coati init` to create one...\n');
				let initialized: boolean;
				try {
					initialized = await runInitFlow(ctx, cwd);
				} catch (e) {
					ctx.io.error(e instanceof Error ? e.message : 'Init failed.');
					process.exit(1);
					return;
				}
				if (!initialized) {
					process.exit(0);
					return;
				}
				ctx.io.print('');
			}

			// Read and validate coati.json
			let manifest: Manifest;
			try {
				manifest = readManifest(cwd);
			} catch (e) {
				ctx.io.error(e instanceof Error ? e.message : 'Failed to read coati.json.');
				process.exit(1);
				return;
			}

			// Prompt for org/visibility when visibility is absent from manifest (same logic as init)
			const needsPrompt = !manifest.visibility;
			const needsTeams = !!manifest.org || needsPrompt;

			let teams: TeamInfo[] = [];
			if (needsTeams) {
				teams = await fetchTeams(ctx);
			}

			if (needsPrompt && !ctx.io.isJson()) {
				manifest = await promptAndPersistOrgVisibility(ctx, manifest, teams, cwd);
			}

			// Validate agent references in manifest
			const validatedManifest = await validateAgentRefs(ctx, manifest, cwd);
			if (validatedManifest === null) {
				process.exit(1);
				return;
			}
			manifest = validatedManifest;

			// Read file contents from disk
			const filesPayload: PublishFileContent[] = [];
			const emptyFilePaths: string[] = [];

			for (const file of manifest.files) {
				const filePath = path.join(cwd, file.path);
				let content: string;
				try {
					content = fs.readFileSync(filePath, 'utf-8');
				} catch {
					ctx.io.error(`Cannot read file: ${file.path}`);
					process.exit(1);
					return;
				}
				if (content.length === 0) {
					emptyFilePaths.push(file.path);
				}
				filesPayload.push({
					path: file.path,
					componentType: file.componentType ?? 'instruction',
					...(file.description ? { description: file.description } : {}),
					...(file.agent ? { agent: file.agent } : {}),
					content
				});
			}

			if (emptyFilePaths.length > 0) {
				ctx.io.error(
					`Cannot publish: ${emptyFilePaths.length} file${emptyFilePaths.length === 1 ? ' is' : 's are'} empty.`
				);
				for (const p of emptyFilePaths) {
					ctx.io.print(`  ${p}`);
				}
				ctx.io.print('Add content or remove these entries from coati.json before publishing.');
				process.exit(1);
				return;
			}

			// Build payload using pure buildPublishPayload function
			let payload: ReturnType<typeof buildPublishPayload>;
			try {
				payload = buildPublishPayload(manifest, teams, filesPayload);
			} catch (e) {
				if (e instanceof OrgNotFoundError) {
					ctx.io.error(e.message);
					process.exit(1);
					return;
				}
				throw e;
			}

			const isUpdate = !!manifest.id;

			if (!ctx.io.isJson()) {
				ctx.io.print(`${isUpdate ? 'Updating' : 'Publishing'} ${owner}/${manifest.name}...`);
			}

			const doPublish = async (): Promise<SetupResponse> => {
				const currentOwner = ctx.fs.readConfig().username!;
				const currentPayload = { ...payload, owner: currentOwner };
				if (!isUpdate) {
					const res = await ctx.api.post<SetupResponse>(`/setups`, currentPayload);
					const updatedManifest = insertIdIntoManifest(manifest, res.id);
					writeManifest(cwd, updatedManifest);
					return res;
				} else {
					return await ctx.api.patch<SetupResponse>(`/setups/${manifest.id}`, currentPayload);
				}
			};

			let result: SetupResponse;
			try {
				result = await doPublish();
			} catch (e) {
				// On auth failure, offer to log in and retry
				if (
					e instanceof ApiError &&
					(e.status === 401 || (e.status === 403 && !isUpdate)) &&
					!ctx.io.isJson()
				) {
					ctx.io.warning('Authentication failed. Your session may have expired.');
					const shouldLogin = await confirm('Would you like to log in again?', true);
					if (shouldLogin) {
						await runLoginFlow(ctx);
						ctx.io.print('Retrying publish...');
						try {
							result = await doPublish();
						} catch (retryErr) {
							ctx.io.error(
								retryErr instanceof Error
									? `Publish failed after re-login: ${retryErr.message}`
									: 'Publish failed after re-login.'
							);
							process.exit(1);
							return;
						}
					} else {
						ctx.io.print('Run `coati login` when you are ready to re-authenticate.');
						process.exit(0);
						return;
					}
				} else if (e instanceof ApiError) {
					if (isUpdate && e.status === 404) {
						ctx.io.error(
							'Setup with this ID no longer exists. Remove `id` from coati.json to publish as new.'
						);
					} else if (isUpdate && e.status === 403) {
						ctx.io.error("You don't own the setup with this ID.");
					} else if (e.status === 401 || e.status === 403) {
						ctx.io.error('Authentication failed. Run `coati login` to re-authenticate.');
					} else if (e.status === 409 && e.code === 'SLUG_TAKEN') {
						ctx.io.error('A setup with this slug already exists. Choose a different name or slug.');
					} else if (e.status === 422 || e.status === 400) {
						ctx.io.error(`Validation error: ${e.message}`);
					} else if (e.status === 500) {
						ctx.io.error('Server error. Please try again later.');
					} else {
						ctx.io.error(`Failed to ${isUpdate ? 'update' : 'publish'} setup: ${e.message}`);
					}
					process.exit(1);
					return;
				} else if (e instanceof Error) {
					if (
						e.message.includes('ECONNREFUSED') ||
						e.message.includes('ETIMEDOUT') ||
						e.message.includes('ENOTFOUND') ||
						e.message.includes('fetch failed')
					) {
						ctx.io.error('Could not reach the Coati API. Check your internet connection.');
					} else {
						ctx.io.error(`Failed to ${isUpdate ? 'update' : 'publish'} setup: ${e.message}`);
					}
					process.exit(1);
					return;
				} else {
					ctx.io.error('An unexpected error occurred.');
					process.exit(1);
					return;
				}
			}

			const currentConfig = ctx.fs.readConfig();
			const platformBase = currentConfig.apiBase.replace('/api/v1', '');
			const setupUrl = `${platformBase}/${currentConfig.username}/${result.slug}`;

			if (ctx.io.isJson()) {
				ctx.io.json({
					action: isUpdate ? 'updated' : 'created',
					owner: currentConfig.username,
					slug: result.slug,
					url: setupUrl
				});
			} else {
				ctx.io.print('');
				ctx.io.success(`Setup ${isUpdate ? 'updated' : 'published'} successfully.`);
				ctx.io.print(`  ${setupUrl}`);
				ctx.io.print('');
				ctx.io.print(formatEmbedSnippet(setupUrl));
			}
		});
}
