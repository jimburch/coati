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
type ConflictChoice = ConflictResolution | 'show-diff';

/** Prompt the user to resolve a file conflict. When "Show diff" is selected,
 *  prints a colorized unified diff and re-prompts with the same 4 options. */
export async function resolveConflict(
	filePath: string,
	incomingContent: string
): Promise<ConflictResolution> {
	p.log.warn(`Conflict: ${filePath} already exists`);

	for (;;) {
		const choice = await select<ConflictChoice>('How do you want to handle this?', [
			{ label: 'Overwrite', value: 'overwrite' },
			{ label: 'Skip', value: 'skip' },
			{ label: `Backup existing (→ ${filePath}.bak)`, value: 'backup' },
			{ label: 'Show diff', value: 'show-diff' }
		]);

		if (choice !== 'show-diff') return choice;

		const existingContent = fs.readFileSync(filePath, 'utf-8');
		process.stdout.write('\n' + generateDiff(existingContent, incomingContent, filePath) + '\n');
	}
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

	return { name, description, category, agents, tags };
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
	source: string;
	target: string;
	placement: string;
}

/**
 * Present a file list and let the user select which files to install
 * using arrow keys + space to toggle, enter to confirm.
 * Returns the indices (0-based) of selected files.
 */
export async function pickFiles(files: PickableFile[]): Promise<number[]> {
	if (isJsonMode()) requiresInteractivity('file picker');

	const options = files.map((f, i) => ({
		label: `${f.source} → ${f.target} (${f.placement})`,
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
