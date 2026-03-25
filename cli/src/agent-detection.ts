import fs from 'fs';
import os from 'os';
import path from 'path';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';

/**
 * Check whether a home-relative path exists (e.g. ".claude" → ~/.claude/).
 */
export function isHomePathPresent(relPath: string): boolean {
	return fs.existsSync(path.join(os.homedir(), relPath));
}

/**
 * Check whether a CLI command is available on the user's PATH.
 */
export function isCommandOnPath(cmd: string): boolean {
	const pathEnv = process.env.PATH ?? '';
	const dirs = pathEnv.split(path.delimiter).filter(Boolean);
	const exts =
		process.platform === 'win32'
			? (process.env.PATHEXT ?? '.EXE;.COM;.BAT').split(';').map((e) => e.toLowerCase())
			: [''];
	for (const dir of dirs) {
		for (const ext of exts) {
			const full = path.join(dir, cmd + ext);
			try {
				fs.accessSync(full, fs.constants.X_OK);
				return true;
			} catch {
				// not found here — try next
			}
		}
	}
	return false;
}

/**
 * Given a list of agent slugs from a setup, return the subset that are
 * currently installed on the user's machine (home dir check OR PATH check).
 */
export function detectInstalledAgents(slugs: string[]): string[] {
	return slugs.filter((slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		if (!agent) return false;
		if (agent.detection.homePaths.some((hp) => isHomePathPresent(hp))) return true;
		return agent.detection.cliCommands.some((cmd) => isCommandOnPath(cmd));
	});
}
