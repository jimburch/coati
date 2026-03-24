import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { get, post, patch, ApiError } from '../api.js';
import { readManifest, MANIFEST_FILENAME } from '../manifest.js';
import { getConfig } from '../config.js';
import { isLoggedIn } from '../auth.js';
import { setOutputMode, isJsonMode, json, print, success, error, info } from '../output.js';
import { runInitFlow } from './init.js';

interface PublishOptions {
	json?: boolean;
}

interface SetupResponse {
	id: string;
	slug: string;
	name: string;
	ownerUsername: string;
}

export function registerPublish(program: Command): void {
	program
		.command('publish')
		.description('Publish or update a setup from the current directory')
		.option('--json', 'Output results as JSON')
		.action(async (opts: PublishOptions) => {
			if (opts.json) setOutputMode('json');

			const cwd = process.cwd();
			const config = getConfig();

			// Require authentication
			if (!isLoggedIn()) {
				error('Not logged in. Run `magpie login` to authenticate.');
				process.exit(1);
				return;
			}

			const owner = config.username!;

			// Check for setup.json; auto-run init if absent
			const manifestPath = path.join(cwd, MANIFEST_FILENAME);
			if (!fs.existsSync(manifestPath)) {
				if (isJsonMode()) {
					error('No setup.json found. Run `magpie init` first.');
					process.exit(1);
					return;
				}
				info('No setup.json found. Running `magpie init` to create one...\n');
				let initialized: boolean;
				try {
					initialized = await runInitFlow(cwd);
				} catch (e) {
					error(e instanceof Error ? e.message : 'Init failed.');
					process.exit(1);
					return;
				}
				if (!initialized) {
					process.exit(0);
					return;
				}
				print('');
			}

			// Read and validate setup.json
			let manifest;
			try {
				manifest = readManifest(cwd);
			} catch (e) {
				error(e instanceof Error ? e.message : 'Failed to read setup.json.');
				process.exit(1);
				return;
			}

			// Read file contents from disk
			const filesPayload: Array<{
				source: string;
				target: string;
				placement: string;
				componentType: string;
				description?: string;
				content: string;
			}> = [];

			for (const file of manifest.files) {
				const filePath = path.join(cwd, file.source);
				let content: string;
				try {
					content = fs.readFileSync(filePath, 'utf-8');
				} catch {
					error(`Cannot read file: ${file.source}`);
					process.exit(1);
					return;
				}
				filesPayload.push({
					source: file.source,
					target: file.target,
					placement: file.placement,
					componentType: file.componentType ?? 'instruction',
					...(file.description ? { description: file.description } : {}),
					content
				});
			}

			const slug = manifest.name;

			// Determine create vs update: check if setup exists
			let setupExists = false;
			try {
				await get(`/setups/${owner}/${slug}`);
				setupExists = true;
			} catch (e) {
				if (e instanceof ApiError && e.status === 404) {
					setupExists = false;
				} else if (e instanceof Error) {
					error(`Failed to check setup: ${e.message}`);
					process.exit(1);
					return;
				}
			}

			// Build payload
			const payload = {
				name: manifest.name,
				slug: manifest.name,
				description: manifest.description,
				version: manifest.version,
				...(manifest.category ? { category: manifest.category } : {}),
				...(manifest.license ? { license: manifest.license } : {}),
				...(manifest.minToolVersion ? { minToolVersion: manifest.minToolVersion } : {}),
				files: filesPayload
			};

			if (!isJsonMode()) {
				print(`${setupExists ? 'Updating' : 'Publishing'} ${owner}/${slug}...`);
			}

			let result: SetupResponse;
			try {
				if (setupExists) {
					result = await patch<SetupResponse>(`/setups/${owner}/${slug}`, payload);
				} else {
					result = await post<SetupResponse>(`/setups`, payload);
				}
			} catch (e) {
				if (e instanceof ApiError) {
					if (e.status === 401 || e.status === 403) {
						error(`${e.message}. Run \`magpie login\` to re-authenticate.`);
					} else if (e.status === 422 || e.status === 400) {
						error(`Validation error: ${e.message}`);
					} else {
						error(`Failed to ${setupExists ? 'update' : 'publish'} setup: ${e.message}`);
					}
				} else if (e instanceof Error) {
					error(`Failed to ${setupExists ? 'update' : 'publish'} setup: ${e.message}`);
				} else {
					error('An unexpected error occurred.');
				}
				process.exit(1);
				return;
			}

			const platformBase = config.apiBase.replace('/api/v1', '');
			const setupUrl = `${platformBase}/${owner}/${result.slug}`;

			if (isJsonMode()) {
				json({
					action: setupExists ? 'updated' : 'created',
					owner,
					slug: result.slug,
					url: setupUrl
				});
			} else {
				print('');
				success(`Setup ${setupExists ? 'updated' : 'published'} successfully.`);
				print(`  ${setupUrl}`);
			}
		});
}
