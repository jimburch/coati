import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as api from './api.js';
import { createOutputClient } from './output.js';
import type { OutputMode, ApiError as OutputApiError, TableColumn } from './output.js';
import * as prompts from './prompts.js';
import * as auth from './auth.js';
import { getConfig } from './config.js';
import * as files from './files.js';

const execAsync = promisify(exec);

export type { ApiClientOptions } from './api.js';
export type { OutputMode, TableColumn } from './output.js';
export type {
	ConflictFile,
	ConflictResolution,
	InstallDestination,
	PickableFile,
	SetupMetadata
} from './prompts.js';
export type { DeviceCodeResponse, PollResult } from './auth.js';
export type { Config } from './config.js';
export type { FileToWrite, WriteOptions, WriteResult } from './files.js';

// Re-export for consumers who need the error class as a data type.
export { ApiError } from './api.js';

// ── Sub-interface: ApiClient ──────────────────────────────────────────────────

export interface ApiClient {
	get<T = unknown>(path: string, options?: api.ApiClientOptions): Promise<T>;
	post<T = unknown>(path: string, body?: unknown, options?: api.ApiClientOptions): Promise<T>;
	patch<T = unknown>(path: string, body?: unknown, options?: api.ApiClientOptions): Promise<T>;
	del(path: string, options?: api.ApiClientOptions): Promise<void>;
}

// ── Sub-interface: IoClient ───────────────────────────────────────────────────

export interface IoClient {
	// Output
	print(message: string): void;
	success(message: string): void;
	error(message: string): void;
	warning(message: string): void;
	info(message: string): void;
	json(data: unknown): void;
	apiError(err: OutputApiError): void;
	table(rows: Record<string, unknown>[], columns: TableColumn[]): void;
	isJson(): boolean;
	isVerbose(): boolean;
	setOutputMode(mode: OutputMode): void;

	// Interactive prompts
	confirm(message: string, defaultValue?: boolean): Promise<boolean>;
	select<T extends string>(message: string, options: { label: string; value: T }[]): Promise<T>;
	text(message: string, opts?: { placeholder?: string; defaultValue?: string }): Promise<string>;
	resolveConflict(filePath: string, incomingContent: string): Promise<prompts.ConflictResolution>;
	resolveConflicts(files: prompts.ConflictFile[]): Promise<Map<string, prompts.ConflictResolution>>;
	promptDestination(defaultScope?: prompts.InstallDestination): Promise<prompts.InstallDestination>;
	promptAgentSelection(agents: { slug: string; displayName: string }[]): Promise<string>;
	checklist<T extends string>(
		message: string,
		choices: { label: string; value: T }[],
		preselected?: T[],
		min?: number
	): Promise<T[]>;
	promptMetadata(
		prefilledAgents?: string[],
		agentChoices?: { label: string; value: string }[],
		categoryChoices?: { label: string; value: string }[]
	): Promise<prompts.SetupMetadata>;
	promptVisibility(): Promise<'public' | 'private'>;
	confirmFileList(files: string[]): Promise<boolean>;
	confirmPostInstall(command: string): Promise<boolean>;
	pickFiles(files: prompts.PickableFile[]): Promise<number[]>;
}

// ── Sub-interface: AuthClient ─────────────────────────────────────────────────

export interface AuthClient {
	isLoggedIn(): boolean;
	getUsername(): string | undefined;
	requestDeviceCode(): Promise<auth.DeviceCodeResponse>;
	pollForToken(deviceCode: string, interval: number, expiresIn: number): Promise<auth.PollResult>;
	verifyToken(): Promise<string>;
	storeCredentials(token: string, username: string): void;
	clearCredentials(): void;
	serverLogout(): Promise<void>;
}

// ── Sub-interface: FsClient ───────────────────────────────────────────────────

export interface FsClient {
	existsSync(path: string): boolean;
	readConfig(): import('./config.js').Config;
	writeSetupFiles(
		filesToWrite: files.FileToWrite[],
		options?: files.WriteOptions
	): Promise<files.WriteResult>;
	resolveTargetPath(
		filePath: string,
		placement: import('./manifest.js').ManifestPlacement,
		options?: files.WriteOptions
	): string;
	runCommand(
		command: string,
		options: { cwd?: string }
	): Promise<{ stdout: string; stderr: string }>;
	writeJson(filePath: string, data: unknown): void;
}

// ── Top-level CommandContext ──────────────────────────────────────────────────

export interface CommandContext {
	readonly api: ApiClient;
	readonly io: IoClient;
	readonly auth: AuthClient;
	readonly fs: FsClient;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Create a CommandContext wired to the real CLI modules. */
export function createContext(): CommandContext {
	const outputClient = createOutputClient();

	return {
		api: {
			get: api.get,
			post: api.post,
			patch: api.patch,
			del: api.del
		},

		io: {
			// Output methods — bound to the outputClient instance
			print: (text) => outputClient.print(text),
			success: (message) => outputClient.success(message),
			error: (message) => outputClient.error(message),
			warning: (message) => outputClient.warning(message),
			info: (message) => outputClient.info(message),
			json: (data) => outputClient.json(data),
			apiError: (err) => outputClient.apiError(err),
			table: (rows, columns) => outputClient.table(rows, columns),
			isJson: () => outputClient.isJsonMode(),
			isVerbose: () => outputClient.isVerbose(),
			setOutputMode: (mode) => outputClient.setOutputMode(mode),

			// Prompt methods
			confirm: prompts.confirm,
			select: prompts.select,
			text: (message, opts?) => prompts.input(message, opts?.defaultValue),
			resolveConflict: prompts.resolveConflict,
			resolveConflicts: prompts.resolveConflicts,
			promptDestination: prompts.promptDestination,
			promptAgentSelection: prompts.promptAgentSelection,
			checklist: prompts.checklist,
			promptMetadata: prompts.promptMetadata,
			promptVisibility: prompts.promptVisibility,
			confirmFileList: prompts.confirmFileList,
			confirmPostInstall: prompts.confirmPostInstall,
			pickFiles: prompts.pickFiles
		},

		auth: {
			isLoggedIn: auth.isLoggedIn,
			getUsername: () => getConfig().username ?? undefined,
			requestDeviceCode: auth.requestDeviceCode,
			pollForToken: auth.pollForToken,
			verifyToken: auth.verifyToken,
			storeCredentials: auth.storeCredentials,
			clearCredentials: auth.clearCredentials,
			serverLogout: auth.serverLogout
		},

		fs: {
			existsSync: fs.existsSync,
			readConfig: getConfig,
			writeSetupFiles: (filesToWrite, options) =>
				files.writeSetupFiles(filesToWrite, { ...options, isJson: outputClient.isJsonMode() }),
			resolveTargetPath: files.resolveTargetPath,
			runCommand: (command, options) => execAsync(command, options),
			writeJson: (filePath, data) =>
				fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n', 'utf-8')
		}
	};
}
