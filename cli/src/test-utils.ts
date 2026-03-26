import { vi } from 'vitest';
import type { CommandContext } from './context.js';

/**
 * Create a CommandContext with all methods stubbed via `vi.fn()`.
 * Pass `overrides` to replace specific methods for a given test.
 *
 * @example
 * const ctx = createTestContext({
 *   api: { get: vi.fn().mockResolvedValue({ id: '1', slug: 'my-setup' }) },
 *   io: { isJson: vi.fn(() => true) },
 * });
 */
export function createTestContext(overrides?: Partial<CommandContext>): CommandContext {
	const base: CommandContext = {
		api: {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			del: vi.fn()
		},

		io: {
			print: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warning: vi.fn(),
			info: vi.fn(),
			json: vi.fn(),
			apiError: vi.fn(),
			table: vi.fn(),
			isJson: vi.fn(() => false),
			isVerbose: vi.fn(() => false),
			setOutputMode: vi.fn(),
			confirm: vi.fn().mockResolvedValue(true),
			select: vi.fn(),
			text: vi.fn(),
			resolveConflict: vi.fn(),
			promptDestination: vi.fn(),
			promptAgentSelection: vi.fn(),
			checklist: vi.fn(),
			promptMetadata: vi.fn(),
			confirmFileList: vi.fn(),
			confirmPostInstall: vi.fn(),
			pickFiles: vi.fn()
		},

		auth: {
			isLoggedIn: vi.fn(() => false),
			getUsername: vi.fn(() => undefined),
			requestDeviceCode: vi.fn(),
			pollForToken: vi.fn(),
			verifyToken: vi.fn(),
			storeCredentials: vi.fn(),
			clearCredentials: vi.fn(),
			serverLogout: vi.fn()
		},

		fs: {
			existsSync: vi.fn(() => false),
			readConfig: vi.fn(() => ({ apiBase: 'https://coati.sh/api/v1' })),
			writeSetupFiles: vi.fn(),
			resolveTargetPath: vi.fn(),
			runCommand: vi.fn()
		}
	};

	if (!overrides) return base;

	return {
		api: { ...base.api, ...overrides.api },
		io: { ...base.io, ...overrides.io },
		auth: { ...base.auth, ...overrides.auth },
		fs: { ...base.fs, ...overrides.fs }
	};
}
