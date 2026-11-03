import { isSafeRelativePath, type Placement } from '@coati/validation';
import { formatSelector, parseSelector, type Selector } from './selector.js';

/**
 * A Setup path split into its parts (spec §3). `filePath` is relative to the
 * home directory for `global` placement (the `~/` is dropped) and to the
 * project root for `project`. `selector` is set for a Settings fragment.
 */
export type ParsedSetupPath = {
	placement: Placement;
	filePath: string;
	selector: Selector | null;
};

/**
 * Parses `CLAUDE.md`, `~/.claude/skills/x/SKILL.md` or `.mcp.json#mcpServers.github`,
 * or returns null if the path breaks the grammar. The file part can't contain `#`,
 * so the first `#` starts the selector; a later `#` is legal only inside a quoted token.
 */
export function parseSetupPath(path: string): ParsedSetupPath | null {
	const hash = path.indexOf('#');
	const filePart = hash === -1 ? path : path.slice(0, hash);
	if (!isSafeRelativePath(filePart)) return null;

	let selector: Selector | null = null;
	if (hash !== -1) {
		selector = parseSelector(path.slice(hash + 1));
		if (!selector) return null;
	}

	const global = filePart.startsWith('~/');
	return {
		placement: global ? 'global' : 'project',
		filePath: global ? filePart.slice(2) : filePart,
		selector
	};
}

/** Builds a Setup path from its parts. Throws if they don't make a valid one. */
export function formatSetupPath(parts: ParsedSetupPath): string {
	const path =
		(parts.placement === 'global' ? '~/' : '') +
		parts.filePath +
		(parts.selector ? `#${formatSelector(parts.selector)}` : '');
	if (parts.filePath.includes('#') || !parseSetupPath(path)) {
		throw new Error(`Not a valid Setup path: ${path}`);
	}
	return path;
}
