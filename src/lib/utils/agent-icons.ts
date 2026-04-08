import claudeCodeSvg from '$lib/assets/agents/claude-code.svg?raw';
import codexSvg from '$lib/assets/agents/codex.svg?raw';
import copilotSvg from '$lib/assets/agents/copilot.svg?raw';
import cursorSvg from '$lib/assets/agents/cursor.svg?raw';
import geminiSvg from '$lib/assets/agents/gemini.svg?raw';
import opencodeSvg from '$lib/assets/agents/opencode.svg?raw';

/** Maps agent slugs to raw SVG strings. */
export const agentIcons: Record<string, string> = {
	'claude-code': claudeCodeSvg,
	codex: codexSvg,
	copilot: copilotSvg,
	cursor: cursorSvg,
	gemini: geminiSvg,
	opencode: opencodeSvg
};

/** Returns the raw SVG string for the given agent slug, or undefined if not found. */
export function getAgentIcon(slug: string): string | undefined {
	return agentIcons[slug];
}
