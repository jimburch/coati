import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import { ApiError } from '../context.js';
import { readManifest, writeManifest, MANIFEST_FILENAME, type Manifest } from '../manifest.js';
import type { CommandContext } from '../context.js';
import { runInitFlow } from './init.js';

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
				.map((f) => f.source)
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

interface SetupResponse {
	id: string;
	slug: string;
	name: string;
	ownerUsername: string;
}

export function registerPublish(program: Command, ctx: CommandContext): void {
	program
		.command('publish')
		.description('Publish or update a setup from the current directory')
		.option('--json', 'Output results as JSON')
		.action(async (opts: PublishOptions) => {
			if (opts.json) ctx.io.setOutputMode('json');

			const cwd = process.cwd();
			const config = ctx.fs.readConfig();

			// Require authentication
			if (!ctx.auth.isLoggedIn()) {
				ctx.io.error('Not logged in. Run `coati login` to authenticate.');
				process.exit(1);
				return;
			}

			const owner = config.username!;

			// Check for setup.json; auto-run init if absent
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

			// Read and validate setup.json
			let manifest;
			try {
				manifest = readManifest(cwd);
			} catch (e) {
				ctx.io.error(e instanceof Error ? e.message : 'Failed to read setup.json.');
				process.exit(1);
				return;
			}

			// Validate agent references in manifest
			const validatedManifest = await validateAgentRefs(ctx, manifest, cwd);
			if (validatedManifest === null) {
				process.exit(1);
				return;
			}
			manifest = validatedManifest;

			// Read file contents from disk
			const filesPayload: Array<{
				source: string;
				target: string;
				placement: string;
				componentType: string;
				description?: string;
				content: string;
			}> = [];

			for (const file of manifest.files) {
				const filePath = path.join(cwd, file.source);
				let content: string;
				try {
					content = fs.readFileSync(filePath, 'utf-8');
				} catch {
					ctx.io.error(`Cannot read file: ${file.source}`);
					process.exit(1);
					return;
				}
				filesPayload.push({
					source: file.source,
					target: file.target,
					placement: file.placement,
					componentType: file.componentType ?? 'instruction',
					...(file.description ? { description: file.description } : {}),
					content
				});
			}

			const slug = manifest.name;

			// Determine create vs update: check if setup exists
			let setupExists = false;
			try {
				await ctx.api.get(`/setups/${owner}/${slug}`);
				setupExists = true;
			} catch (e) {
				if (e instanceof ApiError && e.status === 404) {
					setupExists = false;
				} else if (e instanceof Error) {
					ctx.io.error(`Failed to check setup: ${e.message}`);
					process.exit(1);
					return;
				}
			}

			// Build payload
			const payload = {
				name: manifest.name,
				slug: manifest.name,
				description: manifest.description,
				version: manifest.version,
				...(manifest.category ? { category: manifest.category } : {}),
				...(manifest.license ? { license: manifest.license } : {}),
				...(manifest.minToolVersion ? { minToolVersion: manifest.minToolVersion } : {}),
				files: filesPayload
			};

			if (!ctx.io.isJson()) {
				ctx.io.print(`${setupExists ? 'Updating' : 'Publishing'} ${owner}/${slug}...`);
			}

			let result: SetupResponse;
			try {
				if (setupExists) {
					result = await ctx.api.patch<SetupResponse>(`/setups/${owner}/${slug}`, payload);
				} else {
					result = await ctx.api.post<SetupResponse>(`/setups`, payload);
				}
			} catch (e) {
				if (e instanceof ApiError) {
					if (e.status === 401 || e.status === 403) {
						ctx.io.error('Authentication failed. Run `coati login` to re-authenticate.');
					} else if (e.status === 409 && e.code === 'SLUG_TAKEN') {
						ctx.io.error('A setup with this slug already exists. Choose a different name or slug.');
					} else if (e.status === 422 || e.status === 400) {
						ctx.io.error(`Validation error: ${e.message}`);
					} else if (e.status === 500) {
						ctx.io.error('Server error. Please try again later.');
					} else {
						ctx.io.error(`Failed to ${setupExists ? 'update' : 'publish'} setup: ${e.message}`);
					}
				} else if (e instanceof Error) {
					if (
						e.message.includes('ECONNREFUSED') ||
						e.message.includes('ETIMEDOUT') ||
						e.message.includes('ENOTFOUND') ||
						e.message.includes('fetch failed')
					) {
						ctx.io.error('Could not reach the Coati API. Check your internet connection.');
					} else {
						ctx.io.error(`Failed to ${setupExists ? 'update' : 'publish'} setup: ${e.message}`);
					}
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
				return;
			}

			const platformBase = config.apiBase.replace('/api/v1', '');
			const setupUrl = `${platformBase}/${owner}/${result.slug}`;

			if (ctx.io.isJson()) {
				ctx.io.json({
					action: setupExists ? 'updated' : 'created',
					owner,
					slug: result.slug,
					url: setupUrl
				});
			} else {
				ctx.io.print('');
				ctx.io.success(`Setup ${setupExists ? 'updated' : 'published'} successfully.`);
				ctx.io.print(`  ${setupUrl}`);
			}
		});
}
