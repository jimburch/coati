import pc from 'picocolors';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import type { DetectedFile } from './detector.js';
import type { ManifestComponentType } from './manifest.js';

const TYPE_COLORS: Record<ManifestComponentType, (s: string) => string> = {
	instruction: pc.blue,
	command: pc.green,
	skill: pc.magenta,
	mcp_server: pc.cyan,
	hook: pc.yellow,
	config: pc.blue,
	policy: pc.red,
	agent_def: pc.magenta,
	ignore: pc.dim,
	setup_script: pc.yellow
};

const TYPE_LABELS: Record<ManifestComponentType, string> = {
	instruction: 'instruction',
	command: 'command',
	skill: 'skill',
	mcp_server: 'mcp',
	hook: 'hook',
	config: 'config',
	policy: 'policy',
	agent_def: 'agent',
	ignore: 'ignore',
	setup_script: 'script'
};

function typeBadge(componentType: ManifestComponentType, width: number): string {
	const label = (TYPE_LABELS[componentType] ?? componentType).padEnd(width);
	const colorFn = TYPE_COLORS[componentType] ?? pc.dim;
	return colorFn(label);
}

/**
 * Format a list of detected files grouped by agent, with colored type badges.
 *
 * Example output:
 *
 *   Claude Code  (7 files)
 *   ──────────────────────
 *     command      .claude/commands/review.md → ~/.claude/commands/review.md
 *     command      .claude/commands/test-coverage.md → ~/.claude/commands/test-coverage.md
 *     hook         .claude/hooks/pre-commit.sh → ~/.claude/hooks/pre-commit.sh
 *     instruction  .claude/settings.json → ~/.claude/settings.json
 *     skill        .claude/skills/api-patterns/SKILL.md → ~/.claude/skills/api-patterns/SKILL.md
 *     mcp          .mcp.json → .mcp.json
 *     instruction  CLAUDE.md → CLAUDE.md
 */
export function formatFileList(files: DetectedFile[]): string {
	// Group by agent
	const groups = new Map<string, DetectedFile[]>();
	for (const f of files) {
		const key = f.tool || '_unknown';
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(f);
	}

	// Find the widest type label for alignment
	const maxLabelLen = Math.max(...Object.values(TYPE_LABELS).map((l) => l.length));

	const lines: string[] = [];

	for (const [agentSlug, agentFiles] of groups) {
		const agent = AGENTS_BY_SLUG[agentSlug];
		const name = agent?.displayName ?? agentSlug;
		const count = agentFiles.length;
		const header = `${pc.bold(name)}  ${pc.dim(`(${count} file${count === 1 ? '' : 's'})`)}`;

		lines.push(header);
		lines.push(pc.dim('─'.repeat(name.length + ` (${count} files)`.length + 2)));

		for (const f of agentFiles) {
			const badge = typeBadge(f.componentType, maxLabelLen);
			const arrow = pc.dim('→');
			lines.push(`  ${badge}  ${f.source} ${arrow} ${f.target}`);
		}

		lines.push('');
	}

	return lines.join('\n');
}
