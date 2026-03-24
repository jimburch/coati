import readline from 'readline';
import { isJsonMode } from './output.js';

function requiresInteractivity(label: string): never {
	throw new Error(`Interactive prompt required but --json mode is active: ${label}`);
}

function createRl(): readline.Interface {
	return readline.createInterface({ input: process.stdin, output: process.stdout });
}

/** Ask a yes/no question. Returns true for yes, false for no. */
export async function confirm(question: string, defaultValue = true): Promise<boolean> {
	if (isJsonMode()) requiresInteractivity(question);

	const hint = defaultValue ? '[Y/n]' : '[y/N]';
	const rl = createRl();

	return new Promise((resolve) => {
		rl.question(`${question} ${hint} `, (answer) => {
			rl.close();
			if (answer === '') {
				resolve(defaultValue);
			} else {
				resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
			}
		});
	});
}

/** Present a numbered list and ask the user to pick one. */
export async function select<T extends string>(
	question: string,
	choices: { label: string; value: T }[]
): Promise<T> {
	if (isJsonMode()) requiresInteractivity(question);

	choices.forEach(({ label }, i) => {
		process.stdout.write(`  ${i + 1}. ${label}\n`);
	});

	return new Promise((resolve) => {
		const rl = createRl();
		const ask = () => {
			rl.question(`${question} (1-${choices.length}): `, (answer) => {
				const n = parseInt(answer, 10);
				if (n >= 1 && n <= choices.length) {
					rl.close();
					resolve(choices[n - 1]!.value);
				} else {
					process.stdout.write(`Please enter a number between 1 and ${choices.length}\n`);
					ask();
				}
			});
		};
		ask();
	});
}

/** Ask for a single line of text input. */
export async function input(question: string, defaultValue?: string): Promise<string> {
	if (isJsonMode()) requiresInteractivity(question);

	const hint = defaultValue !== undefined ? ` (${defaultValue})` : '';
	const rl = createRl();

	return new Promise((resolve) => {
		rl.question(`${question}${hint}: `, (answer) => {
			rl.close();
			resolve(answer !== '' ? answer : (defaultValue ?? ''));
		});
	});
}

export type ConflictResolution = 'overwrite' | 'skip' | 'backup';

/** Prompt the user to resolve a file conflict. */
export async function resolveConflict(filePath: string): Promise<ConflictResolution> {
	process.stdout.write(`\n⚠ Conflict: ${filePath} already exists\n`);
	return select<ConflictResolution>('How do you want to handle this?', [
		{ label: 'Overwrite', value: 'overwrite' },
		{ label: 'Skip', value: 'skip' },
		{ label: `Backup existing (→ ${filePath}.bak)`, value: 'backup' }
	]);
}

export type InstallDestination = 'current' | 'global';

/** Ask where the user wants to install a setup. */
export async function promptDestination(): Promise<InstallDestination> {
	return select<InstallDestination>('Where would you like to install?', [
		{ label: 'Install to current directory', value: 'current' },
		{ label: 'Install globally (~/.magpie/setups/)', value: 'global' }
	]);
}

export interface SetupMetadata {
	name: string;
	description: string;
	category: string;
	tools: string[];
	tags: string[];
}

/** Interactively collect setup metadata from the user. */
export async function promptMetadata(): Promise<SetupMetadata> {
	const name = await input('Setup name');
	const description = await input('Description');
	const category = await input(
		'Category (web-dev, mobile, data-science, devops, systems, general)',
		'general'
	);
	const toolsRaw = await input('Tools (comma-separated, e.g. claude-code, cursor)', '');
	const tagsRaw = await input('Tags (comma-separated)', '');

	const tools = toolsRaw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
	const tags = tagsRaw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	return { name, description, category, tools, tags };
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
 * Present a numbered file list and let the user select which files to install.
 * Returns the indices (0-based) of selected files.
 * Pressing Enter with no input selects all files.
 */
export async function pickFiles(files: PickableFile[]): Promise<number[]> {
	if (isJsonMode()) requiresInteractivity('file picker');

	process.stdout.write('\nFiles available to install:\n');
	files.forEach((f, i) => {
		process.stdout.write(`  ${i + 1}. ${f.source} → ${f.target} (${f.placement})\n`);
	});

	return new Promise((resolve) => {
		const rl = createRl();
		rl.question(
			'\nEnter file numbers to install (space-separated), or press Enter for all: ',
			(answer) => {
				rl.close();
				const trimmed = answer.trim();
				if (trimmed === '') {
					resolve(files.map((_, i) => i));
				} else {
					const indices = trimmed
						.split(/\s+/)
						.map((n) => parseInt(n, 10) - 1)
						.filter((n) => n >= 0 && n < files.length);
					const unique = [...new Set(indices)].sort((a, b) => a - b);
					resolve(unique);
				}
			}
		);
	});
}
