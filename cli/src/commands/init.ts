import path from 'path';
import { Command } from 'commander';
import { AGENTS } from '@coati/agents-registry';
import { detectFiles } from '../detector.js';
import {
	writeManifest,
	MANIFEST_FILENAME,
	type Manifest,
	type ManifestCategory
} from '../manifest.js';
import { formatFileList } from '../format.js';
import type { CommandContext } from '../context.js';
import { runLoginFlow } from './login.js';
import type { TeamInfo } from '../publish-payload.js';

const VALID_CATEGORIES: ManifestCategory[] = [
	'web-dev',
	'mobile',
	'data-science',
	'devops',
	'systems',
	'general'
];

export function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Compute the set of unique agent slugs present in the detected files,
 * and how many files each agent contributed.
 */
export function computeDetectedAgents(
	detected: ReturnType<typeof detectFiles>
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const f of detected) {
		if (f.tool) {
			counts.set(f.tool, (counts.get(f.tool) ?? 0) + 1);
		}
	}
	return counts;
}

/**
 * Fetch the user's teams from the API.
 * Returns an empty array on error so the flow can continue without a team prompt.
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
 * Run the init flow in the given directory.
 * Returns true if coati.json was successfully written, false if the user cancelled.
 * Throws on unrecoverable errors (e.g. invalid slug).
 */
export async function runInitFlow(ctx: CommandContext, cwd: string): Promise<boolean> {
	const manifestPath = path.join(cwd, MANIFEST_FILENAME);

	// Require authentication — offer login flow if not logged in
	if (!ctx.auth.isLoggedIn()) {
		if (ctx.io.isJson()) {
			ctx.io.error('Not logged in. Run `coati login` to authenticate.');
			process.exit(1);
			return false;
		}
		ctx.io.warning('You are not logged in.');
		const shouldLogin = await ctx.io.confirm('Would you like to log in now?', true);
		if (!shouldLogin) {
			ctx.io.print('Run `coati login` when you are ready to authenticate.');
			return false;
		}
		await runLoginFlow(ctx);
	}

	// Edge case: coati.json already exists
	if (ctx.fs.existsSync(manifestPath)) {
		ctx.io.warning(`${MANIFEST_FILENAME} already exists in this directory.`);
		const overwrite = await ctx.io.confirm('Overwrite existing coati.json?', false);
		if (!overwrite) {
			ctx.io.print('Exiting without changes.');
			return false;
		}
	}

	// Scan for known AI config files
	ctx.io.print('Scanning for AI config files...\n');
	const detected = detectFiles(cwd);

	// Compute agent summary from detected files
	const agentFileCounts = computeDetectedAgents(detected);
	const autoDetectedAgents = [...agentFileCounts.keys()];

	let filesToInclude = detected;

	if (detected.length === 0) {
		// Edge case: no files detected
		ctx.io.warning('No AI config files detected in this directory.');
		ctx.io.print(
			'Add your config files (e.g. .claude/commands/, .cursorrules) then re-run `coati init`.'
		);
		const continueAnyway = await ctx.io.confirm(
			'Continue and create a coati.json scaffold anyway?',
			false
		);
		if (!continueAnyway) {
			return false;
		}
		filesToInclude = [];
	} else {
		if (!ctx.io.isJson()) {
			// Show detected files grouped by agent with colored type badges
			const formatted = formatFileList(detected);
			process.stdout.write('\n' + formatted + '\n');

			const fileChoices = detected.map((f) => ({ label: f.path, value: f.path }));
			const allPaths = detected.map((f) => f.path);
			const selected = await ctx.io.checklist('Select files to include', fileChoices, allPaths, 1);
			if (selected.length === 0) {
				ctx.io.error('At least 1 file must be selected.');
				return false;
			}
			filesToInclude = detected.filter((f) => selected.includes(f.path));
		}
		// In JSON mode: filesToInclude remains as detected (all files)
	}

	// Fetch teams once and determine org/visibility from user choice
	const teams = await fetchTeams(ctx);
	let pickedOrg: string | undefined;
	let visibility: 'public' | 'private' = 'public';

	if (teams.length > 0 && !ctx.io.isJson()) {
		const orgChoices: { label: string; value: string }[] = [
			{ label: 'My profile', value: '__personal__' },
			...teams.map((t) => ({ label: t.name, value: t.slug }))
		];
		const orgChoice = await ctx.io.select('Where does this setup live?', orgChoices);
		if (orgChoice !== '__personal__') {
			pickedOrg = orgChoice;
			visibility = 'private';
		} else {
			visibility = await ctx.io.promptVisibility();
		}
	} else if (!ctx.io.isJson()) {
		visibility = await ctx.io.promptVisibility();
	}

	// Build choice lists for interactive prompts
	const agentChoices = AGENTS.map((a) => ({ label: a.displayName, value: a.slug }));
	const categoryChoices: { label: string; value: string }[] = [
		{ label: 'General', value: 'general' },
		{ label: 'Web Dev', value: 'web-dev' },
		{ label: 'Mobile', value: 'mobile' },
		{ label: 'Data Science', value: 'data-science' },
		{ label: 'DevOps', value: 'devops' },
		{ label: 'Systems', value: 'systems' }
	];

	// Prompt for setup metadata (agents pre-filled from detection)
	ctx.io.print('\nSetup metadata:\n');
	const metadata = await ctx.io.promptMetadata(autoDetectedAgents, agentChoices, categoryChoices);

	// Derive and validate the slug from the name
	const display = metadata.name.trim();
	const slug = toSlug(display);
	if (!slug) {
		throw new Error('Setup name is required.');
	}
	if (slug !== display) {
		ctx.io.print(`Using slug: ${slug}`);
	}

	// Validate category
	const category =
		metadata.category && VALID_CATEGORIES.includes(metadata.category as ManifestCategory)
			? (metadata.category as ManifestCategory)
			: undefined;

	// Merge auto-detected agents with any user-provided ones from metadata
	const allAgents = [...new Set([...autoDetectedAgents, ...metadata.agents])];

	// Build the manifest — auto-tag each file with its agent field
	const manifest: Manifest = {
		...(display && { display }),
		name: slug,
		version: '1.0.0',
		description: metadata.description,
		...(category !== undefined && { category }),
		...(allAgents.length > 0 && { agents: allAgents }),
		...(metadata.tags.length > 0 && { tags: metadata.tags }),
		...(pickedOrg ? { org: pickedOrg } : {}),
		visibility,
		files: filesToInclude.map((f) => ({
			path: f.path,
			componentType: f.componentType,
			...(f.tool && { agent: f.tool })
		}))
	};

	writeManifest(cwd, manifest);
	ctx.io.success(`Created ${MANIFEST_FILENAME}`);
	ctx.io.print(`  ${manifestPath}`);

	if (!ctx.io.isJson()) {
		ctx.io.info('Edit coati.json to adjust files, metadata, or post-install commands.');
	}

	if (filesToInclude.length === 0) {
		ctx.io.warning(`No files included. Edit ${MANIFEST_FILENAME} to add files before publishing.`);
	}

	return true;
}

export function registerInit(program: Command, ctx: CommandContext): void {
	program
		.command('init')
		.description('Scaffold a coati.json manifest in the current directory')
		.action(async () => {
			try {
				const ok = await runInitFlow(ctx, process.cwd());
				if (!ok) process.exit(0);
			} catch (e) {
				ctx.io.error(e instanceof Error ? e.message : 'Init failed.');
				process.exit(1);
			}
		});
}
