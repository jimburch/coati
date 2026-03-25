import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@magpie/agents-registry';
import { detectFiles } from '../detector.js';
import {
	writeManifest,
	MANIFEST_FILENAME,
	type Manifest,
	type ManifestCategory
} from '../manifest.js';
import { confirm, confirmFileList, promptMetadata } from '../prompts.js';
import { print, success, error, warning } from '../output.js';

const VALID_CATEGORIES: ManifestCategory[] = [
	'web-dev',
	'mobile',
	'data-science',
	'devops',
	'systems',
	'general'
];

function toSlug(name: string): string {
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
 * Run the init flow in the given directory.
 * Returns true if setup.json was successfully written, false if the user cancelled.
 * Throws on unrecoverable errors (e.g. invalid slug).
 */
export async function runInitFlow(cwd: string): Promise<boolean> {
	const manifestPath = path.join(cwd, MANIFEST_FILENAME);

	// Edge case: setup.json already exists
	if (fs.existsSync(manifestPath)) {
		warning(`${MANIFEST_FILENAME} already exists in this directory.`);
		const overwrite = await confirm('Overwrite existing setup.json?', false);
		if (!overwrite) {
			print('Exiting without changes.');
			return false;
		}
	}

	// Scan for known AI config files
	print('Scanning for AI config files...\n');
	const detected = detectFiles(cwd);

	// Compute agent summary from detected files
	const agentFileCounts = computeDetectedAgents(detected);
	const autoDetectedAgents = [...agentFileCounts.keys()];

	// Report detected agents to the user
	if (autoDetectedAgents.length > 0) {
		const agentSummary = autoDetectedAgents
			.map((slug) => {
				const agent = AGENTS_BY_SLUG[slug];
				const count = agentFileCounts.get(slug)!;
				const name = agent?.displayName ?? slug;
				return `${name} (${count} file${count === 1 ? '' : 's'})`;
			})
			.join(', ');
		print(`Found config files for: ${agentSummary}\n`);
	}

	let filesToInclude = detected;

	if (detected.length === 0) {
		// Edge case: no files detected
		warning('No AI config files detected in this directory.');
		print(
			'Add your config files (e.g. .claude/commands/, .cursorrules) then re-run `magpie init`.'
		);
		const continueAnyway = await confirm(
			'Continue and create a setup.json scaffold anyway?',
			false
		);
		if (!continueAnyway) {
			return false;
		}
		filesToInclude = [];
	} else {
		// Show detected files (with agent tags) and ask user to confirm
		const fileLabels = detected.map((f) => {
			const agentTag = f.tool ? `  [agent: ${f.tool}]` : '';
			return `${f.source}  →  ${f.target}  [${f.componentType}]${agentTag}`;
		});
		const confirmed = await confirmFileList(fileLabels);
		if (!confirmed) {
			print('Exiting without changes.');
			return false;
		}
	}

	// Prompt for setup metadata (agents pre-filled from detection)
	print('\nSetup metadata:\n');
	const metadata = await promptMetadata(autoDetectedAgents);

	// Derive and validate the slug from the name
	const slug = toSlug(metadata.name);
	if (!slug) {
		throw new Error('Setup name is required.');
	}
	if (slug !== metadata.name) {
		print(`Using slug: ${slug}`);
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
		name: slug,
		version: '1.0.0',
		description: metadata.description,
		...(category !== undefined && { category }),
		...(allAgents.length > 0 && { agents: allAgents }),
		...(metadata.tags.length > 0 && { tags: metadata.tags }),
		files: filesToInclude.map((f) => ({
			source: f.source,
			target: f.target,
			placement: f.placement,
			componentType: f.componentType,
			...(f.tool && { agent: f.tool })
		}))
	};

	writeManifest(cwd, manifest);
	success(`Created ${MANIFEST_FILENAME}`);
	print(`  ${manifestPath}`);

	if (filesToInclude.length === 0) {
		warning(`No files included. Edit ${MANIFEST_FILENAME} to add files before publishing.`);
	}

	return true;
}

export function registerInit(program: Command): void {
	program
		.command('init')
		.description('Scaffold a setup.json manifest in the current directory')
		.action(async () => {
			try {
				const ok = await runInitFlow(process.cwd());
				if (!ok) process.exit(0);
			} catch (e) {
				error(e instanceof Error ? e.message : 'Init failed.');
				process.exit(1);
			}
		});
}
