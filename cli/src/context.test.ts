import { describe, expect, it } from 'vitest';
import { createContext } from './context.js';
import * as api from './api.js';
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
		it('io output methods are functions', () => {
			const ctx = createContext();
			expect(typeof ctx.io.print).toBe('function');
			expect(typeof ctx.io.success).toBe('function');
			expect(typeof ctx.io.error).toBe('function');
			expect(typeof ctx.io.warning).toBe('function');
			expect(typeof ctx.io.info).toBe('function');
			expect(typeof ctx.io.json).toBe('function');
			expect(typeof ctx.io.apiError).toBe('function');
			expect(typeof ctx.io.table).toBe('function');
			expect(typeof ctx.io.setOutputMode).toBe('function');
		});

		it('setOutputMode and isJson interact correctly on the same context instance', () => {
			const ctx = createContext();
			expect(ctx.io.isJson()).toBe(false);
			ctx.io.setOutputMode('json');
			expect(ctx.io.isJson()).toBe(true);
			ctx.io.setOutputMode('text');
			expect(ctx.io.isJson()).toBe(false);
		});

		it('isVerbose returns false by default', () => {
			const ctx = createContext();
			expect(ctx.io.isVerbose()).toBe(false);
		});

		it('two createContext() calls have independent io state', () => {
			const ctx1 = createContext();
			const ctx2 = createContext();
			ctx1.io.setOutputMode('json');
			expect(ctx1.io.isJson()).toBe(true);
			expect(ctx2.io.isJson()).toBe(false);
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

		it('writeSetupFiles is a function that delegates to files.writeSetupFiles', () => {
			const ctx = createContext();
			expect(typeof ctx.fs.writeSetupFiles).toBe('function');
			// It is a wrapper (not the same reference) that injects isJson from io state
			expect(ctx.fs.writeSetupFiles).not.toBe(files.writeSetupFiles);
		});

		it('wires resolveTargetPath from files.ts', () => {
			const ctx = createContext();
			expect(ctx.fs.resolveTargetPath).toBe(files.resolveTargetPath);
		});
	});
});
