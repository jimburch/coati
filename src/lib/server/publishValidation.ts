/**
 * Publish validation (spec §5, "Publish validation"): the per-file checks that
 * both `POST /api/v1/setups` and `PATCH /api/v1/setups/[id]` run before
 * anything is written. Pure, so it's unit-tested without a database.
 */

import { parseSetupPath } from '@coati/content-hash';
import {
	allowedAgentsFor,
	getAgentForFile,
	getComponentTypeForFile,
	getOfferedSelector,
	getSettingsFile,
	isAllowedHomePath,
	isPersonalFile
} from '@coati/agents-registry';
import type { ComponentType } from '@coati/validation';

export type PublishErrorCode =
	| 'INVALID_PATH'
	| 'SETTINGS_FILE_WHOLE'
	| 'INVALID_SELECTOR'
	| 'INVALID_CLASSIFICATION'
	| 'VALIDATION_ERROR';

/** A publish request the server refuses. The route turns it into `{ error, code }` with `status`. */
export class PublishError extends Error {
	constructor(
		message: string,
		readonly code: PublishErrorCode | 'REVISION_CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND',
		readonly status: number,
		readonly extra: Record<string, unknown> = {}
	) {
		super(message);
		this.name = 'PublishError';
	}
}

export type PublishFileInput = {
	path: string;
	content: string;
	/** `undefined` means "detect"; `null` means the owner picked none. */
	agent?: string | null;
	componentType?: ComponentType;
	description?: string;
};

/** A file's Classification as it's stored on first add (#400). */
export type Classification = {
	agent: string | null;
	componentType: ComponentType;
	description: string | null;
};

function invalid(code: PublishErrorCode, message: string): PublishError {
	return new PublishError(message, code, 400);
}

/**
 * Checks one path and its content. Throws a `PublishError` for a bad path,
 * a whole Settings file, an unoffered or personal selector, or fragment
 * content that isn't JSON. Classification is checked separately, because it
 * only applies to paths the Setup doesn't have yet.
 */
export function validatePublishPath(path: string, content: string): void {
	const parsed = parseSetupPath(path);
	if (!parsed) throw invalid('INVALID_PATH', `Invalid path: ${path}`);

	// Personal files (`.claude/settings.local.json`, `~/.claude.json`) are a selector
	// problem in the spec's table, so they're checked before the home allowlist.
	if (isPersonalFile(path)) {
		throw invalid('INVALID_SELECTOR', `${path} is personal and can't be published`);
	}

	if (parsed.placement === 'global' && !isAllowedHomePath(path)) {
		throw invalid('INVALID_PATH', `${path} isn't a file any Agent reads from the home directory`);
	}

	const settingsFile = getSettingsFile(path);
	if (!parsed.selector) {
		if (settingsFile) {
			throw invalid(
				'SETTINGS_FILE_WHOLE',
				`${path} is a Settings file. Publish its fragments (${path}#<selector>), not the whole file`
			);
		}
		return;
	}

	if (!settingsFile || !getOfferedSelector(path)) {
		throw invalid('INVALID_SELECTOR', `${path} isn't a fragment that can be published`);
	}

	try {
		JSON.parse(content);
	} catch {
		throw invalid('VALIDATION_ERROR', `${path} must hold a JSON value`);
	}
}

/**
 * Validates every file and rejects duplicate paths. Throws the first problem
 * found, naming its path.
 */
export function validatePublishFiles(files: readonly PublishFileInput[]): void {
	const seen = new Set<string>();
	for (const file of files) {
		if (seen.has(file.path)) {
			throw invalid('VALIDATION_ERROR', `Duplicate path: ${file.path}`);
		}
		seen.add(file.path);
		validatePublishPath(file.path, file.content);
	}
}

/**
 * The Classification a new path is stored with: the client's choice where
 * it's allowed, detection where the client sent nothing.
 *
 * - `agent` must be one of `allowedAgentsFor(path)`. With exactly one, the
 *   Agent is locked, so `null` is rejected too. Omitted means detection.
 * - A fragment's `componentType` must equal its selector's. A whole file can
 *   be any type. Omitted means detection, then `instruction`.
 */
export function resolveClassification(file: PublishFileInput): Classification {
	const allowed: string[] = allowedAgentsFor(file.path);
	const fragment = getOfferedSelector(file.path);

	let agent: string | null;
	if (file.agent === undefined) {
		agent = getAgentForFile(file.path)?.slug ?? (allowed.length === 1 ? allowed[0] : null);
	} else if (file.agent === null) {
		if (allowed.length === 1) {
			throw invalid(
				'INVALID_CLASSIFICATION',
				`${file.path} can only be classified as ${allowed[0]}`
			);
		}
		agent = null;
	} else if (allowed.includes(file.agent)) {
		agent = file.agent;
	} else {
		throw invalid(
			'INVALID_CLASSIFICATION',
			allowed.length === 0
				? `${file.path} isn't read by any Agent, so it can't be classified as ${file.agent}`
				: `${file.path} can't be classified as ${file.agent} (allowed: ${allowed.join(', ')})`
		);
	}

	let componentType: ComponentType;
	if (fragment) {
		if (file.componentType !== undefined && file.componentType !== fragment.componentType) {
			throw invalid(
				'INVALID_CLASSIFICATION',
				`${file.path} is a ${fragment.componentType} fragment, not ${file.componentType}`
			);
		}
		componentType = fragment.componentType;
	} else {
		componentType = file.componentType ?? getComponentTypeForFile(file.path) ?? 'instruction';
	}

	return { agent, componentType, description: file.description ?? null };
}
