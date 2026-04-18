import fs from 'fs';
import * as p from '@clack/prompts';
import { generateDiff } from './diff.js';
import { isJsonMode } from './output.js';

function requiresInteractivity(label: string): never {
	throw new Error(`Interactive prompt required but --json mode is active: ${label}`);
}

function assertNotCancelled<T>(value: T | symbol): asserts value is T {
	if (p.isCancel(value)) {
		p.cancel('Operation cancelled.');
		process.exit(0);
	}
}

/** Ask a yes/no question. Returns true for yes, false for no. */
export async function confirm(question: string, defaultValue = true): Promise<boolean> {
	if (isJsonMode()) requiresInteractivity(question);

	const result = await p.confirm({
		message: question,
		initialValue: defaultValue
	});
	assertNotCancelled(result);
	return result;
}

/** Present a list and ask the user to pick one (arrow keys + enter). */
export async function select<T extends string>(
	question: string,
	choices: { label: string; value: T }[]
): Promise<T> {
	if (isJsonMode()) requiresInteractivity(question);

	const result = await p.select({
		message: question,
		options: choices
	});
	assertNotCancelled(result);
	return result as T;
}

/** Ask for a single line of text input. */
export async function input(question: string, defaultValue?: string): Promise<string> {
	if (isJsonMode()) requiresInteractivity(question);

	const result = await p.text({
		message: question,
		placeholder: defaultValue,
		defaultValue
	});
	assertNotCancelled(result);
	return result;
}

export type ConflictResolution = 'overwrite' | 'skip' | 'backup';

export interface ConflictFile {
	/** Relative path shown to the user (e.g. `.claude/commands/test.md`). */
	relativePath: string;
	/** Absolute path on disk — used to read existing content for diffs. */
	absolutePath: string;
	/** The incoming file content that would be written. */
	incomingContent: string;
}

const RESOLUTION_LABELS: Record<ConflictResolution, string> = {
	overwrite: 'overwrite',
	skip: 'skip',
	backup: 'backup'
};

const RESOLUTION_ICONS: Record<ConflictResolution, string> = {
	overwrite: '✓',
	skip: '-',
	backup: '↻'
};

/**
 * Batch conflict resolver. Shows all conflicting files in a single interactive
 * menu. The user can change per-file actions, view diffs, or apply bulk actions
 * before confirming.
 *
 * Returns a Map from absolutePath → resolution for every conflict file.
 */
export async function resolveConflicts(
	files: ConflictFile[]
): Promise<Map<string, ConflictResolution>> {
	if (isJsonMode()) requiresInteractivity('conflict resolution');

	const resolutions = new Map<string, ConflictResolution>();
	for (const f of files) {
		resolutions.set(f.absolutePath, 'overwrite');
	}

	if (files.length === 1) {
		// Single file — simpler inline prompt
		const f = files[0]!;
		p.log.warn(`Conflict: ${f.relativePath} already exists`);
		const result = await resolveSingleConflict(f);
		resolutions.set(f.absolutePath, result);
		return resolutions;
	}

	p.log.warn(`${files.length} files already exist and will conflict:`);

	for (;;) {
		// Build the current state display
		const fileOptions = files.map((f) => {
			const res = resolutions.get(f.absolutePath)!;
			const icon = RESOLUTION_ICONS[res];
			const label = RESOLUTION_LABELS[res];
			return {
				label: `${icon} ${f.relativePath}  (${label})`,
				value: f.absolutePath
			};
		});

		type MenuChoice = string | 'bulk-overwrite' | 'bulk-skip' | 'bulk-backup' | 'confirm';

		const allChoices: { label: string; value: MenuChoice }[] = [
			...fileOptions,
			{ label: '─────────────────────────', value: 'sep-1' as MenuChoice },
			{ label: 'Overwrite all', value: 'bulk-overwrite' },
			{ label: 'Skip all', value: 'bulk-skip' },
			{ label: 'Backup all', value: 'bulk-backup' },
			{ label: '─────────────────────────', value: 'sep-2' as MenuChoice },
			{ label: 'Confirm & proceed', value: 'confirm' }
		];

		const choice = await select<MenuChoice>(
			'Review conflicts (select a file to change action)',
			allChoices
		);

		if (choice === 'confirm') break;

		if (choice === 'bulk-overwrite') {
			for (const f of files) resolutions.set(f.absolutePath, 'overwrite');
			continue;
		}
		if (choice === 'bulk-skip') {
			for (const f of files) resolutions.set(f.absolutePath, 'skip');
			continue;
		}
		if (choice === 'bulk-backup') {
			for (const f of files) resolutions.set(f.absolutePath, 'backup');
			continue;
		}

		// Separator items — ignore
		if (choice === 'sep-1' || choice === 'sep-2') continue;

		// User selected a file — show per-file action sub-menu
		const selected = files.find((f) => f.absolutePath === choice);
		if (!selected) continue;

		await resolveFileAction(selected, resolutions);
	}

	return resolutions;
}

/** Sub-menu for a single file within the batch resolver. */
async function resolveFileAction(
	file: ConflictFile,
	resolutions: Map<string, ConflictResolution>
): Promise<void> {
	type FileChoice = ConflictResolution | 'show-diff';

	for (;;) {
		const choice = await select<FileChoice>(`${file.relativePath}`, [
			{ label: 'Overwrite', value: 'overwrite' },
			{ label: 'Skip', value: 'skip' },
			{ label: 'Backup existing', value: 'backup' },
			{ label: 'Show diff', value: 'show-diff' }
		]);

		if (choice === 'show-diff') {
			const existingContent = fs.readFileSync(file.absolutePath, 'utf-8');
			process.stdout.write(
				'\n' + generateDiff(existingContent, file.incomingContent, file.relativePath) + '\n'
			);
			continue;
		}

		resolutions.set(file.absolutePath, choice);
		return;
	}
}

/** Prompt for a single conflict file (used when there's only one conflict). */
async function resolveSingleConflict(file: ConflictFile): Promise<ConflictResolution> {
	type Choice = ConflictResolution | 'show-diff';

	for (;;) {
		const choice = await select<Choice>('How do you want to handle this?', [
			{ label: 'Overwrite', value: 'overwrite' },
			{ label: 'Skip', value: 'skip' },
			{ label: `Backup existing (→ ${file.relativePath}.bak)`, value: 'backup' },
			{ label: 'Show diff', value: 'show-diff' }
		]);

		if (choice !== 'show-diff') return choice;

		const existingContent = fs.readFileSync(file.absolutePath, 'utf-8');
		process.stdout.write(
			'\n' + generateDiff(existingContent, file.incomingContent, file.relativePath) + '\n'
		);
	}
}

/** @deprecated Use resolveConflicts (plural) for batch resolution. */
export async function resolveConflict(
	filePath: string,
	incomingContent: string
): Promise<ConflictResolution> {
	return resolveSingleConflict({
		relativePath: filePath,
		absolutePath: filePath,
		incomingContent
	});
}

export type InstallDestination = 'current' | 'global';

/** Ask where the user wants to install a setup.
 *  Pass `defaultScope` (derived from the setup's file placements) to surface
 *  a [recommended] hint next to the most appropriate choice. */
export async function promptDestination(
	defaultScope: InstallDestination = 'current'
): Promise<InstallDestination> {
	const projectLabel =
		'Install to this project (current directory)' +
		(defaultScope === 'current' ? ' [recommended]' : '');
	const globalLabel =
		'Install globally (home directory)' + (defaultScope === 'global' ? ' [recommended]' : '');

	return select<InstallDestination>('Install scope?', [
		{ label: projectLabel, value: 'current' },
		{ label: globalLabel, value: 'global' }
	]);
}

/** Ask the user to pick one agent from a list of candidates. */
export async function promptAgentSelection(
	agents: { slug: string; displayName: string }[]
): Promise<string> {
	const choices = agents.map((a) => ({ label: a.displayName, value: a.slug }));
	return select<string>('Install files for which agent?', choices);
}

/**
 * Present an interactive checklist (arrow keys to move, space to toggle, enter to confirm).
 * At least `min` items must be selected.
 * Returns the values of all selected items.
 */
export async function checklist<T extends string>(
	question: string,
	choices: { label: string; value: T }[],
	preselected: T[] = [],
	min = 0
): Promise<T[]> {
	if (isJsonMode()) requiresInteractivity(question);

	const result = await p.multiselect({
		message: question,
		options: choices,
		initialValues: preselected,
		required: min > 0
	});
	assertNotCancelled(result);
	return result as T[];
}

export interface SetupMetadata {
	name: string;
	description: string;
	category: string;
	agents: string[];
	tags: string[];
	visibility: 'public' | 'private';
}

/** Interactively collect setup metadata from the user.
 *  `prefilledAgents` pre-checks agents in the checklist from auto-detection.
 *  `agentChoices` and `categoryChoices` let init.ts supply the option lists. */
export async function promptMetadata(
	prefilledAgents: string[] = [],
	agentChoices: { label: string; value: string }[] = [],
	categoryChoices: { label: string; value: string }[] = []
): Promise<SetupMetadata> {
	const name = await input('Setup name');
	const description = await input('Description');

	// Category — single select
	let category = 'general';
	if (categoryChoices.length > 0) {
		category = await select<string>('Category', categoryChoices);
	} else {
		category = await input(
			'Category (web-dev, mobile, data-science, devops, systems, general)',
			'general'
		);
	}

	// Agents — checklist (must pick at least 1)
	let agents: string[];
	if (agentChoices.length > 0) {
		agents = await checklist<string>('Agents', agentChoices, prefilledAgents, 1);
	} else {
		const agentsDefault = prefilledAgents.join(', ');
		const agentsRaw = await input(
			'Agents (comma-separated, e.g. claude-code, cursor)',
			agentsDefault
		);
		agents = agentsRaw
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	const tagsRaw = await input('Tags (comma-separated)', '');
	const tags = tagsRaw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	const visibility = await select<'public' | 'private'>('Visibility', [
		{ label: 'Public', value: 'public' },
		{ label: 'Private', value: 'private' }
	]);

	return { name, description, category, agents, tags, visibility };
}

/** Show a numbered file list and ask for confirmation. */
export async function confirmFileList(files: string[]): Promise<boolean> {
	process.stdout.write('\nFiles to be included:\n');
	files.forEach((f, i) => {
		process.stdout.write(`  ${i + 1}. ${f}\n`);
	});
	process.stdout.write('\n');
	return confirm('Proceed with these files?');
}

/** Ask the user to confirm a post-install command before running it. */
export async function confirmPostInstall(command: string): Promise<boolean> {
	return confirm(`Run post-install command: ${command}?`);
}

export interface PickableFile {
	path: string;
}

/**
 * Present a file list and let the user select which files to install
 * using arrow keys + space to toggle, enter to confirm.
 * Returns the indices (0-based) of selected files.
 */
export async function pickFiles(files: PickableFile[]): Promise<number[]> {
	if (isJsonMode()) requiresInteractivity('file picker');

	const options = files.map((f, i) => ({
		label: f.path,
		value: i
	}));

	const result = await p.multiselect({
		message: 'Select files to install',
		options,
		initialValues: files.map((_, i) => i),
		required: true
	});
	assertNotCancelled(result);
	return (result as number[]).sort((a, b) => a - b);
}
