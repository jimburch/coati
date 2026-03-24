import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
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

export function registerInit(program: Command): void {
	program
		.command('init')
		.description('Scaffold a setup.json manifest in the current directory')
		.action(async () => {
			const cwd = process.cwd();
			const manifestPath = path.join(cwd, MANIFEST_FILENAME);

			// Edge case: setup.json already exists
			if (fs.existsSync(manifestPath)) {
				warning(`${MANIFEST_FILENAME} already exists in this directory.`);
				const overwrite = await confirm('Overwrite existing setup.json?', false);
				if (!overwrite) {
					print('Exiting without changes.');
					process.exit(0);
				}
			}

			// Scan for known AI config files
			print('Scanning for AI config files...\n');
			const detected = detectFiles(cwd);

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
					process.exit(0);
				}
				filesToInclude = [];
			} else {
				// Show detected files and ask user to confirm
				const fileLabels = detected.map((f) => `${f.source}  →  ${f.target}  [${f.componentType}]`);
				const confirmed = await confirmFileList(fileLabels);
				if (!confirmed) {
					print('Exiting without changes.');
					process.exit(0);
				}
			}

			// Prompt for setup metadata
			print('\nSetup metadata:\n');
			const metadata = await promptMetadata();

			// Derive and validate the slug from the name
			const slug = toSlug(metadata.name);
			if (!slug) {
				error('Setup name is required.');
				process.exit(1);
			}
			if (slug !== metadata.name) {
				print(`Using slug: ${slug}`);
			}

			// Validate category
			const category =
				metadata.category && VALID_CATEGORIES.includes(metadata.category as ManifestCategory)
					? (metadata.category as ManifestCategory)
					: undefined;

			// Build the manifest
			const manifest: Manifest = {
				name: slug,
				version: '1.0.0',
				description: metadata.description,
				...(category !== undefined && { category }),
				...(metadata.tools.length > 0 && { tools: metadata.tools }),
				...(metadata.tags.length > 0 && { tags: metadata.tags }),
				files: filesToInclude.map((f) => ({
					source: f.source,
					target: f.target,
					placement: f.placement,
					componentType: f.componentType
				}))
			};

			writeManifest(cwd, manifest);
			success(`Created ${MANIFEST_FILENAME}`);
			print(`  ${manifestPath}`);

			if (filesToInclude.length === 0) {
				warning(`No files included. Edit ${MANIFEST_FILENAME} to add files before publishing.`);
			}
		});
}
