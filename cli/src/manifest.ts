import fs from 'fs';
import path from 'path';
import { manifestSchema, zodPathToField } from './validation.js';

export type ManifestPlacement = 'global' | 'project';
export type ManifestComponentType =
	| 'instruction'
	| 'command'
	| 'skill'
	| 'mcp_server'
	| 'hook'
	| 'config'
	| 'policy'
	| 'agent_def'
	| 'ignore'
	| 'setup_script';
export type ManifestCategory =
	| 'web-dev'
	| 'mobile'
	| 'data-science'
	| 'devops'
	| 'systems'
	| 'general';

export type ManifestVisibility = 'public' | 'private';

export interface ManifestFileEntry {
	path: string;
	componentType?: ManifestComponentType;
	description?: string;
	agent?: string;
}

export interface Manifest {
	$schema?: string;
	/** UUID assigned by the server on first publish. Written back to coati.json automatically. */
	id?: string;
	/** UUID of the upstream setup this was cloned from. Written by `coati clone`. */
	sourceId?: string;
	/** Human-friendly display name (e.g. "My Awesome Setup"). Written by `coati init`. */
	display?: string;
	name: string;
	version: string;
	description: string;
	/** @deprecated Placement is no longer part of the manifest schema. Field is ignored if present. */
	placement?: ManifestPlacement;
	agents?: string[];
	tags?: string[];
	category?: ManifestCategory;
	license?: string;
	minToolVersion?: string;
	postInstall?: string[];
	prerequisites?: string[];
	visibility?: ManifestVisibility;
	/** Team slug — written by `coati init` / `coati publish` when publishing to a team. */
	org?: string;
	readme?: string;
	files: ManifestFileEntry[];
	/** Clone-tracking fields — written by `coati clone`, ignored during publish. */
	source?: string;
	clonedAt?: string;
	revision?: string;
}

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

export const MANIFEST_FILENAME = 'coati.json';

/**
 * Validate a manifest object against the coati.json schema rules.
 * Internally uses Zod (.safeParse) via manifestSchema; consistent with
 * the server's createSetupWithFilesSchema in src/lib/types/index.ts.
 */
export function validateManifest(data: unknown): ValidationResult {
	if (typeof data !== 'object' || data === null) {
		return { valid: false, errors: [{ field: '', message: 'Manifest must be an object' }] };
	}

	const result = manifestSchema.safeParse(data);
	if (result.success) {
		return { valid: true, errors: [] };
	}

	const errors: ValidationError[] = result.error.issues.map((issue) => ({
		field: zodPathToField(issue.path),
		message: issue.message
	}));

	return { valid: false, errors };
}

/**
 * Read and parse coati.json from the given directory.
 * Throws if the file is missing, malformed, or invalid.
 * If coati.json is not found but setup.json exists, prints a migration message and exits.
 */
export function readManifest(dir: string): Manifest {
	const filePath = path.join(dir, MANIFEST_FILENAME);
	let raw: string;
	try {
		raw = fs.readFileSync(filePath, 'utf-8');
	} catch (err: unknown) {
		const nodeErr = err as NodeJS.ErrnoException;
		if (nodeErr.code === 'ENOENT') {
			const legacyPath = path.join(dir, 'setup.json');
			if (fs.existsSync(legacyPath)) {
				console.log('ℹ Found setup.json — Coati now uses coati.json. Rename it to continue.');
				process.exit(1);
			}
			throw new Error(`No ${MANIFEST_FILENAME} found in ${dir}`);
		}
		throw new Error(`Failed to read ${MANIFEST_FILENAME}: ${nodeErr.message}`);
	}

	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error(`${MANIFEST_FILENAME} is not valid JSON`);
	}

	const result = validateManifest(data);
	if (!result.valid) {
		const messages = result.errors.map((e) =>
			e.field ? `  ${e.field}: ${e.message}` : `  ${e.message}`
		);
		throw new Error(`Invalid ${MANIFEST_FILENAME}:\n${messages.join('\n')}`);
	}

	return data as Manifest;
}

/**
 * Write a manifest object to coati.json in the given directory.
 * Creates the directory if it doesn't exist.
 */
export function writeManifest(dir: string, data: Manifest): void {
	const filePath = path.join(dir, MANIFEST_FILENAME);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n', 'utf-8');
}
