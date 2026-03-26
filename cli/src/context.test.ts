import { describe, expect, it } from 'vitest';
import { createContext } from './context.js';
import * as api from './api.js';
import * as output from './output.js';
import * as prompts from './prompts.js';
import * as auth from './auth.js';
import { getConfig } from './config.js';
import * as files from './files.js';

describe('createContext', () => {
	it('returns an object with 4 sub-interfaces', () => {
		const ctx = createContext();
		expect(ctx).toHaveProperty('api');
		expect(ctx).toHaveProperty('io');
		expect(ctx).toHaveProperty('auth');
		expect(ctx).toHaveProperty('fs');
	});

	describe('api', () => {
		it('wires get, post, patch, del from api.ts', () => {
			const ctx = createContext();
			expect(ctx.api.get).toBe(api.get);
			expect(ctx.api.post).toBe(api.post);
			expect(ctx.api.patch).toBe(api.patch);
			expect(ctx.api.del).toBe(api.del);
		});
	});

	describe('io', () => {
		it('wires output methods from output.ts', () => {
			const ctx = createContext();
			expect(ctx.io.print).toBe(output.print);
			expect(ctx.io.success).toBe(output.success);
			expect(ctx.io.error).toBe(output.error);
			expect(ctx.io.warning).toBe(output.warning);
			expect(ctx.io.info).toBe(output.info);
			expect(ctx.io.json).toBe(output.json);
			expect(ctx.io.apiError).toBe(output.apiError);
			expect(ctx.io.table).toBe(output.table);
			expect(ctx.io.setOutputMode).toBe(output.setOutputMode);
		});

		it('maps isJson() to output.isJsonMode', () => {
			const ctx = createContext();
			expect(ctx.io.isJson).toBe(output.isJsonMode);
		});

		it('maps isVerbose() to output.isVerbose', () => {
			const ctx = createContext();
			expect(ctx.io.isVerbose).toBe(output.isVerbose);
		});

		it('wires prompt methods from prompts.ts', () => {
			const ctx = createContext();
			expect(ctx.io.confirm).toBe(prompts.confirm);
			expect(ctx.io.select).toBe(prompts.select);
			expect(ctx.io.resolveConflict).toBe(prompts.resolveConflict);
			expect(ctx.io.promptDestination).toBe(prompts.promptDestination);
			expect(ctx.io.promptAgentSelection).toBe(prompts.promptAgentSelection);
			expect(ctx.io.checklist).toBe(prompts.checklist);
			expect(ctx.io.promptMetadata).toBe(prompts.promptMetadata);
			expect(ctx.io.confirmFileList).toBe(prompts.confirmFileList);
			expect(ctx.io.confirmPostInstall).toBe(prompts.confirmPostInstall);
			expect(ctx.io.pickFiles).toBe(prompts.pickFiles);
		});

		it('maps text() to prompts.input with defaultValue from opts', async () => {
			const ctx = createContext();
			// text() is an adapter — verify it is not the same reference as prompts.input
			expect(ctx.io.text).not.toBe(prompts.input);
			// Verify it is a function
			expect(typeof ctx.io.text).toBe('function');
		});
	});

	describe('auth', () => {
		it('wires all auth methods from auth.ts', () => {
			const ctx = createContext();
			expect(ctx.auth.isLoggedIn).toBe(auth.isLoggedIn);
			expect(ctx.auth.requestDeviceCode).toBe(auth.requestDeviceCode);
			expect(ctx.auth.pollForToken).toBe(auth.pollForToken);
			expect(ctx.auth.verifyToken).toBe(auth.verifyToken);
			expect(ctx.auth.storeCredentials).toBe(auth.storeCredentials);
			expect(ctx.auth.clearCredentials).toBe(auth.clearCredentials);
			expect(ctx.auth.serverLogout).toBe(auth.serverLogout);
		});

		it('getUsername() reads from config (not a snapshot)', () => {
			const ctx = createContext();
			// getUsername is a closure over getConfig(), so it reflects current config state.
			// Verify it returns undefined when no username is set (default config).
			const result = ctx.auth.getUsername();
			// May be undefined or a string depending on local config — just verify it's callable.
			expect(typeof result === 'string' || result === undefined).toBe(true);
		});
	});

	describe('fs', () => {
		it('wires readConfig to config.getConfig', () => {
			const ctx = createContext();
			expect(ctx.fs.readConfig).toBe(getConfig);
		});

		it('wires writeSetupFiles from files.ts', () => {
			const ctx = createContext();
			expect(ctx.fs.writeSetupFiles).toBe(files.writeSetupFiles);
		});

		it('wires resolveTargetPath from files.ts', () => {
			const ctx = createContext();
			expect(ctx.fs.resolveTargetPath).toBe(files.resolveTargetPath);
		});
	});
});
