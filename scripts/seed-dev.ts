/**
 * scripts/seed-dev.ts
 *
 * Idempotent development seed script. Truncates all tables then populates
 * the database with realistic mock data: real GitHub user profiles + setups.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm run seed:dev
 *   GITHUB_TOKEN=ghp_... DATABASE_URL=postgres://... pnpm run seed:dev
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema.js';
import { AGENTS as AGENT_DEFS } from '@coati/agents-registry';
import type { ComponentType, Placement, Category } from '@coati/validation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GitHubProfile {
	login: string;
	id: number;
	avatar_url: string;
	name: string | null;
	bio: string | null;
	email: string | null;
	blog: string | null;
	location: string | null;
}

export interface GeneratedFile {
	path: string;
	componentType: ComponentType;
	content: string;
	description?: string;
}

export interface GeneratedSetup {
	name: string;
	slug: string;
	description: string;
	readme: string | null;
	placement: Placement;
	category: Category | null;
	license: string | null;
	starsCount: number;
	clonesCount: number;
	files: GeneratedFile[];
	tagNames: string[];
	agentSlugs: string[];
}

export interface SeedResult {
	usersInserted: number;
	agentsInserted: number;
	tagsInserted: number;
	setupsInserted: number;
	filesInserted: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const GITHUB_USERNAMES = [
	'torvalds',
	'gaearon',
	'sindresorhus',
	'ThePrimeagen',
	'tj',
	'yyx990803',
	'antfu7',
	'wesbos',
	'tannerlinsley',
	'colinhacks',
	'Rich-Harris',
	'jaredpalmer',
	'kentcdodds',
	'paulirish',
	'addyosmani',
	'mxstbr',
	'getify',
	'teej4y',
	'benawad',
	'jonhoo',
	'fasterthanlime',
	'dhh',
	'bradfitz',
	'spf13',
	'sharkdp',
	'nicolo-ribaudo',
	'mattdesl',
	'cramforce',
	'mpj',
	'alexellis',
	'nicowillis',
	'jlongster',
	'derickbailey',
	'jakearchibald',
	'marcosvega91'
];

export const TAG_NAMES = [
	'typescript',
	'python',
	'rust',
	'go',
	'react',
	'svelte',
	'testing',
	'ci-cd',
	'docker',
	'security',
	'performance',
	'refactoring',
	'documentation',
	'debugging',
	'ai-workflow',
	'code-review',
	'git',
	'shell',
	'node',
	'api',
	'database',
	'monorepo'
];

// ─── GitHub API ───────────────────────────────────────────────────────────────

export async function fetchGitHubProfile(
	username: string,
	token?: string,
	fetcher: typeof fetch = fetch
): Promise<GitHubProfile | null> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github.v3+json',
		'User-Agent': 'coati-seed-script'
	};
	if (token) {
		headers['Authorization'] = `token ${token}`;
	}

	try {
		const response = await fetcher(`https://api.github.com/users/${username}`, { headers });

		if (response.status === 403 || response.status === 429) {
			const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
			console.warn(`  Rate limited fetching @${username}. Waiting ${retryAfter}s...`);
			await sleep(retryAfter * 1000);
			const retry = await fetcher(`https://api.github.com/users/${username}`, { headers });
			if (!retry.ok) return null;
			return (await retry.json()) as GitHubProfile;
		}

		if (!response.ok) return null;
		return (await response.json()) as GitHubProfile;
	} catch {
		return null;
	}
}

export async function fetchGitHubProfiles(
	usernames: string[],
	token?: string,
	fetcher: typeof fetch = fetch,
	delayMs?: number
): Promise<GitHubProfile[]> {
	const profiles: GitHubProfile[] = [];
	const resolvedDelay = delayMs ?? (token ? 200 : 1500);

	for (const username of usernames) {
		const profile = await fetchGitHubProfile(username, token, fetcher);
		if (profile) {
			profiles.push(profile);
			console.log(`  ✓ Fetched @${profile.login} (id=${profile.id})`);
		} else {
			console.warn(`  ✗ Skipping @${username} (fetch failed)`);
		}
		if (resolvedDelay > 0) {
			await sleep(resolvedDelay);
		}
	}

	return profiles;
}

// ─── Data Generation ──────────────────────────────────────────────────────────

export function generateTagNames(): string[] {
	return TAG_NAMES;
}

/** Pick n items from arr deterministically using index-based selection. */
function pick<T>(arr: T[], count: number, offset: number): T[] {
	const result: T[] = [];
	for (let i = 0; i < count; i++) {
		result.push(arr[(offset + i) % arr.length]);
	}
	return result;
}

/** Generate all setup data for seeding. */
export function generateSetups(
	seedUsers: Array<{ id: string; username: string }>,
	seedTags: Array<{ id: string; name: string }>,
	seedAgents: Array<{ id: string; slug: string }>
): Array<GeneratedSetup & { userId: string }> {
	const generated: Array<GeneratedSetup & { userId: string }> = [];

	// Ensure at least one user has no setups (edge case)
	const usersWithSetups = seedUsers.slice(0, -1);

	// Use sequential idx so all templates cycle evenly
	let idx = 0;
	for (let ui = 0; ui < usersWithSetups.length; ui++) {
		const user = usersWithSetups[ui];
		const numSetups = 3 + (ui % 3); // 3-5 setups per user

		for (let si = 0; si < numSetups; si++) {
			generated.push(buildSetup(user.id, user.username, idx, seedTags, seedAgents));
			idx++;
		}
	}

	return generated;
}

function buildSetup(
	userId: string,
	username: string,
	idx: number,
	seedTags: Array<{ id: string; name: string }>,
	seedAgents: Array<{ id: string; slug: string }>
): GeneratedSetup & { userId: string } {
	const templates = getSetupTemplates();
	const template = templates[idx % templates.length];
	const slug = `${template.slug}-${idx}`;

	// Vary engagement: some highly starred (trending), some brand new
	const isTrending = idx % 7 === 0;
	const isNew = idx % 11 === 0;
	const starsCount = isTrending ? 50 + idx * 3 : isNew ? 0 : 2 + (idx % 20);
	const clonesCount = isTrending ? 200 + idx * 5 : isNew ? 0 : idx % 30;

	// Tag selection: 1-5 tags normally, max tags for one specific setup
	const isMaxTags = idx === 3;
	const tagCount = isMaxTags ? Math.min(seedTags.length, 10) : 1 + (idx % 5);
	const tagNames = pick(seedTags, tagCount, idx).map((t) => t.name);

	// Agent association: ~40% of setups have an agent
	const agentSlugs =
		idx % 5 < 2 && seedAgents.length > 0 ? [seedAgents[idx % seedAgents.length].slug] : [];

	// Edge case: setup with no files
	const noFiles = idx === 1;

	// Edge case: very long description (near 300 char max)
	const longDesc = idx === 2;
	const description = longDesc
		? 'A comprehensive AI coding workflow setup that includes detailed instructions for TypeScript development, test-driven development practices, code review guidelines, and automated quality gates for modern web applications using the latest tools and frameworks.'
		: template.description;

	return {
		userId,
		name: `${template.name} (${username})`,
		slug,
		description: description.slice(0, 300),
		readme: template.readme,
		placement: idx % 3 === 0 ? 'global' : 'project',
		category: template.category,
		license: idx % 4 === 0 ? 'MIT' : idx % 4 === 1 ? 'Apache-2.0' : null,
		starsCount,
		clonesCount,
		files: noFiles ? [] : buildFiles(template, idx),
		tagNames,
		agentSlugs
	};
}

function buildFiles(template: SetupTemplate, idx: number): GeneratedFile[] {
	const fileCount = 1 + (idx % 20); // 1-20 files
	const files: GeneratedFile[] = [];

	// Always include at least one of the template's files
	for (let fi = 0; fi < Math.min(fileCount, template.files.length); fi++) {
		files.push(template.files[fi]);
	}

	// If we need more files, pad with generic instruction files
	for (let fi = template.files.length; fi < fileCount; fi++) {
		files.push({
			path: `docs/guide-${fi}.md`,
			componentType: 'instruction',
			content: `# Guide ${fi}\n\nThis document describes workflow step ${fi}.\n`,
			description: `Workflow guide step ${fi}`
		});
	}

	return files;
}

// ─── Setup Templates ─────────────────────────────────────────────────────────

interface SetupTemplate {
	name: string;
	slug: string;
	description: string;
	readme: string | null;
	category: Category | null;
	files: GeneratedFile[];
}

function getSetupTemplates(): SetupTemplate[] {
	return [
		{
			name: 'Claude Code TDD Workflow',
			slug: 'claude-tdd-workflow',
			description: 'Red-green-refactor TDD loop with Claude Code skill for writing tests first.',
			readme: '# Claude Code TDD Workflow\n\nAn opinionated TDD setup for Claude Code.',
			category: 'general',
			files: [
				{
					path: '.claude/skills/tdd.md',
					componentType: 'skill',
					content:
						'# TDD Skill\n\nRun red-green-refactor: write failing test, implement, refactor.\n\n## Steps\n1. Write a failing test\n2. Write minimal code to pass\n3. Refactor\n',
					description: 'TDD red-green-refactor skill'
				},
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: '# Project Instructions\n\nAlways use TDD. Write tests before implementation.\n',
					description: 'Main Claude instructions'
				}
			]
		},
		{
			name: 'MCP Filesystem Server',
			slug: 'mcp-filesystem',
			description: 'MCP server config for local filesystem access in Claude Code.',
			readme: null,
			category: 'general',
			files: [
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: JSON.stringify(
						{
							mcpServers: {
								filesystem: {
									command: 'npx',
									args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']
								}
							}
						},
						null,
						2
					),
					description: 'MCP filesystem server config'
				}
			]
		},
		{
			name: 'Pre-commit Quality Hook',
			slug: 'pre-commit-hook',
			description: 'Pre-commit hook that runs linting and type checking before every commit.',
			readme: '# Pre-commit Hook\n\nRuns `pnpm lint` and `pnpm check` before commits.',
			category: 'devops',
			files: [
				{
					path: '.claude/hooks/pre-commit.sh',
					componentType: 'hook',
					content: '#!/bin/bash\npnpm lint && pnpm check\n',
					description: 'Pre-commit lint and type check hook'
				}
			]
		},
		{
			name: 'TypeScript Strict Setup',
			slug: 'typescript-strict',
			description: 'Strict TypeScript configuration with comprehensive linting rules.',
			readme: '# TypeScript Strict\n\nStrictly typed TypeScript for production codebases.',
			category: 'web-dev',
			files: [
				{
					path: 'tsconfig.json',
					componentType: 'config',
					content: JSON.stringify(
						{
							compilerOptions: {
								strict: true,
								noUncheckedIndexedAccess: true,
								exactOptionalPropertyTypes: true
							}
						},
						null,
						2
					),
					description: 'Strict TypeScript config'
				},
				{
					path: '.claude/commands/typecheck.md',
					componentType: 'command',
					content: '# Typecheck\n\nRun `pnpm tsc --noEmit` to check types.\n',
					description: 'Typecheck command'
				}
			]
		},
		{
			name: 'Code Review Agent Policy',
			slug: 'code-review-policy',
			description: 'Agent policy that defines code review standards and checklist.',
			readme: null,
			category: 'general',
			files: [
				{
					path: '.claude/policies/code-review.md',
					componentType: 'policy',
					content:
						'# Code Review Policy\n\nAll PRs must:\n- Pass CI\n- Have tests\n- Be reviewed by one peer\n',
					description: 'Code review policy'
				}
			]
		},
		{
			name: 'Docker Dev Environment',
			slug: 'docker-dev',
			description: 'Docker Compose setup for a reproducible local development environment.',
			readme: '# Docker Dev\n\nRun `docker compose up -d` to start all services.',
			category: 'devops',
			files: [
				{
					path: 'docker-compose.yml',
					componentType: 'config',
					content:
						'version: "3.8"\nservices:\n  db:\n    image: postgres:16-alpine\n    ports:\n      - "5432:5432"\n',
					description: 'Docker Compose config'
				},
				{
					path: '.claude/commands/docker-up.md',
					componentType: 'command',
					content: '# Docker Up\n\nRun `docker compose up -d` to start services.\n',
					description: 'Docker up command'
				}
			]
		},
		{
			name: 'Rust Cargo Workflow',
			slug: 'rust-cargo-workflow',
			description: 'Rust development workflow with Cargo commands and clippy linting.',
			readme: '# Rust Cargo Workflow\n\nUse `cargo clippy --all-targets` and `cargo test`.',
			category: 'systems',
			files: [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content:
						'# Rust Project\n\nRun `cargo clippy --all-targets -- -D warnings` before committing.\n',
					description: 'Rust project instructions'
				},
				{
					path: '.claude/skills/cargo.md',
					componentType: 'skill',
					content: '# Cargo Skill\n\n1. `cargo build`\n2. `cargo test`\n3. `cargo clippy`\n',
					description: 'Cargo workflow skill'
				},
				{
					path: '.claude/hooks/check.sh',
					componentType: 'hook',
					content: '#!/bin/bash\ncargo clippy --all-targets -- -D warnings\n',
					description: 'Clippy pre-check hook'
				}
			]
		},
		{
			name: 'Python Data Science Env',
			slug: 'python-data-science',
			description: 'Python environment setup for data science with pandas and jupyter.',
			readme: '# Python Data Science\n\nJupyter + pandas + matplotlib workflow.',
			category: 'data-science',
			files: [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: '# Data Science Project\n\nUse virtual environments. Run jupyter lab.\n',
					description: 'Data science instructions'
				},
				{
					path: '.claude/commands/venv.md',
					componentType: 'command',
					content:
						'# Setup Venv\n\nRun `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`\n',
					description: 'Virtual environment setup command'
				}
			]
		},
		{
			name: 'Go Module Setup',
			slug: 'go-module-setup',
			description: 'Standard Go module layout with Makefile targets for build and test.',
			readme: '# Go Module\n\nRun `make build` and `make test`.',
			category: 'systems',
			files: [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content:
						'# Go Project\n\nRun `go vet ./...` and `golangci-lint run` before committing.\n',
					description: 'Go project instructions'
				},
				{
					path: '.claude/skills/go-testing.md',
					componentType: 'skill',
					content: '# Go Testing\n\nRun `go test ./... -race -count=1`.\n',
					description: 'Go testing skill'
				}
			]
		},
		{
			name: 'GitHub Actions CI',
			slug: 'github-actions-ci',
			description: 'GitHub Actions workflow for continuous integration with matrix builds.',
			readme: '# GitHub Actions CI\n\nMatrix build for multiple OS and language versions.',
			category: 'devops',
			files: [
				{
					path: '.claude/commands/ci-check.md',
					componentType: 'command',
					content: '# Check CI\n\nRun `gh run list --limit 5` to see recent CI runs.\n',
					description: 'CI check command'
				},
				{
					path: '.github/copilot-instructions.md',
					componentType: 'instruction',
					content: '# Copilot Instructions\n\nThis project uses GitHub Actions for CI.\n',
					description: 'Copilot CI instructions'
				}
			]
		},
		{
			name: 'Security Scanning Setup',
			slug: 'security-scanning',
			description: 'Setup for automated security scanning with SAST and dependency audit.',
			readme: null,
			category: 'devops',
			files: [
				{
					path: '.claude/hooks/security-check.sh',
					componentType: 'hook',
					content: '#!/bin/bash\nnpm audit --audit-level=high\n',
					description: 'Security audit hook'
				},
				{
					path: '.claude/policies/security.md',
					componentType: 'policy',
					content:
						'# Security Policy\n\nNo high or critical vulnerabilities allowed in dependencies.\n',
					description: 'Security policy'
				}
			]
		},
		{
			name: 'Mobile React Native',
			slug: 'react-native-setup',
			description: 'React Native development setup with Expo and TypeScript.',
			readme: '# React Native\n\nExpo + TypeScript + Jest setup.',
			category: 'mobile',
			files: [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: '# React Native Project\n\nUse Expo. Run `expo start` for dev server.\n',
					description: 'React Native instructions'
				}
			]
		},
		{
			name: 'Agent Definition Template',
			slug: 'agent-definition',
			description: 'Custom agent definition with specialized tools and capabilities.',
			readme: null,
			category: 'general',
			files: [
				{
					path: '.claude/agents/code-reviewer.md',
					componentType: 'agent_def',
					content:
						'# Code Reviewer Agent\n\nSpecialized agent for thorough code review.\n\n## Tools\n- Read\n- Grep\n- Glob\n',
					description: 'Code reviewer agent definition'
				}
			]
		},
		{
			name: 'Git Ignore Setup',
			slug: 'gitignore-setup',
			description: 'Comprehensive .gitignore templates for modern development projects.',
			readme: null,
			category: 'general',
			files: [
				{
					path: '.gitignore',
					componentType: 'ignore',
					content: 'node_modules/\n.env\n.env.local\ndist/\nbuild/\n.DS_Store\n*.log\ncoverage/\n',
					description: 'Comprehensive gitignore'
				}
			]
		},
		{
			name: 'Database Migration Workflow',
			slug: 'db-migration-workflow',
			description: 'Drizzle ORM migration workflow with automated rollback scripts.',
			readme: '# DB Migrations\n\nUse Drizzle Kit. Run `drizzle-kit migrate` for production.',
			category: 'web-dev',
			files: [
				{
					path: '.claude/commands/db-migrate.md',
					componentType: 'command',
					content: '# DB Migrate\n\nRun `pnpm db:migrate` to apply pending migrations.\n',
					description: 'DB migration command'
				},
				{
					path: '.claude/skills/drizzle.md',
					componentType: 'skill',
					content:
						'# Drizzle Skill\n\n1. Add schema changes\n2. Run `drizzle-kit generate`\n3. Run `drizzle-kit migrate`\n',
					description: 'Drizzle migration skill'
				},
				{
					path: '.claude/hooks/db-check.sh',
					componentType: 'hook',
					content: '#!/bin/bash\ndrizzle-kit check\n',
					description: 'DB schema check hook'
				},
				{
					path: 'scripts/setup-db.sh',
					componentType: 'setup_script',
					content: '#!/bin/bash\ndocker compose up -d postgres\npnpm db:migrate\n',
					description: 'DB setup script'
				}
			]
		}
	];
}

// ─── Main Seed Function ───────────────────────────────────────────────────────

type DrizzleDb = ReturnType<typeof drizzle>;

export async function seed(
	db: DrizzleDb,
	options?: {
		githubToken?: string;
		fetcher?: typeof fetch;
		/** Override inter-request delay in ms (default: 1500 unauthenticated / 200 authenticated) */
		delayMs?: number;
	}
): Promise<SeedResult> {
	const githubToken = options?.githubToken;
	const fetcher = options?.fetcher ?? fetch;

	// 1. Truncate all tables (CASCADE handles FK order)
	console.log('\n→ Truncating all tables...');
	await db.execute(
		sql`TRUNCATE TABLE setup_reports, feedback_submissions, activities, comments, stars,
        setup_agents, setup_tags, setup_files, follows, device_flow_states, sessions,
        setups, users, agents, tags RESTART IDENTITY CASCADE`
	);
	console.log('  ✓ All tables truncated');

	// 2. Insert agents from registry
	console.log('\n→ Inserting agents...');
	const agentRows = AGENT_DEFS.map((a) => ({
		slug: a.slug,
		displayName: a.displayName,
		icon: a.icon,
		website: a.website,
		official: a.official
	}));
	await db.insert(schema.agents).values(agentRows);
	const insertedAgents = await db.select().from(schema.agents);
	console.log(`  ✓ Inserted ${insertedAgents.length} agents`);

	// 3. Fetch GitHub profiles
	console.log('\n→ Fetching GitHub profiles...');
	const profiles = await fetchGitHubProfiles(
		GITHUB_USERNAMES,
		githubToken,
		fetcher,
		options?.delayMs
	);

	if (profiles.length < 5) {
		throw new Error(
			`Only ${profiles.length} GitHub profiles fetched. Check network / GITHUB_TOKEN.`
		);
	}

	// 4. Insert users
	console.log(`\n→ Inserting ${profiles.length} users...`);
	const userRows = profiles.map((p) => ({
		githubId: p.id,
		username: p.login.toLowerCase(),
		githubUsername: p.login,
		email: p.email ?? `${p.login}@users.noreply.github.com`,
		avatarUrl: p.avatar_url,
		name: p.name ?? null,
		bio: p.bio ?? null,
		websiteUrl: p.blog ?? null,
		location: p.location ?? null,
		isBetaApproved: true
	}));
	await db.insert(schema.users).values(userRows);
	const insertedUsers = await db.select().from(schema.users);
	console.log(`  ✓ Inserted ${insertedUsers.length} users`);

	// 5. Insert tags
	console.log('\n→ Inserting tags...');
	const tagRows = generateTagNames().map((name) => ({ name }));
	await db.insert(schema.tags).values(tagRows);
	const insertedTags = await db.select().from(schema.tags);
	console.log(`  ✓ Inserted ${insertedTags.length} tags`);

	// 6. Generate and insert setups
	console.log('\n→ Generating setups...');
	const setupDataList = generateSetups(insertedUsers, insertedTags, insertedAgents);

	// Build tag lookup
	const tagByName = new Map(insertedTags.map((t) => [t.name, t]));
	// Build agent lookup
	const agentBySlug = new Map(insertedAgents.map((a) => [a.slug, a]));

	let totalFiles = 0;

	for (const setupData of setupDataList) {
		// Insert setup
		const [inserted] = await db
			.insert(schema.setups)
			.values({
				userId: setupData.userId,
				name: setupData.name,
				slug: setupData.slug,
				description: setupData.description,
				readme: setupData.readme,
				placement: setupData.placement,
				category: setupData.category ?? undefined,
				license: setupData.license ?? undefined,
				starsCount: setupData.starsCount,
				clonesCount: setupData.clonesCount
			})
			.returning({ id: schema.setups.id });

		const setupId = inserted.id;

		// Insert files
		if (setupData.files.length > 0) {
			const fileRows = setupData.files.map((f) => ({
				setupId,
				path: f.path,
				componentType: f.componentType,
				content: f.content,
				description: f.description ?? null
			}));
			await db.insert(schema.setupFiles).values(fileRows);
			totalFiles += fileRows.length;
		}

		// Insert setup-tag relations
		const tagRelations = setupData.tagNames
			.map((name) => tagByName.get(name))
			.filter((t) => t !== undefined)
			.map((t) => ({ setupId, tagId: t!.id }));
		if (tagRelations.length > 0) {
			await db.insert(schema.setupTags).values(tagRelations);
		}

		// Insert setup-agent relations
		const agentRelations = setupData.agentSlugs
			.map((slug) => agentBySlug.get(slug))
			.filter((a) => a !== undefined)
			.map((a) => ({ setupId, agentId: a!.id }));
		if (agentRelations.length > 0) {
			await db.insert(schema.setupAgents).values(agentRelations);
		}
	}

	// 7. Update user setups_count
	for (const user of insertedUsers) {
		const userSetups = setupDataList.filter((s) => s.userId === user.id);
		if (userSetups.length > 0) {
			await db
				.update(schema.users)
				.set({ setupsCount: userSetups.length })
				.where(sql`id = ${user.id}`);
		}
	}

	const insertedSetups = await db.select().from(schema.setups);
	console.log(`  ✓ Inserted ${insertedSetups.length} setups with ${totalFiles} files`);

	const result: SeedResult = {
		usersInserted: insertedUsers.length,
		agentsInserted: insertedAgents.length,
		tagsInserted: insertedTags.length,
		setupsInserted: insertedSetups.length,
		filesInserted: totalFiles
	};

	console.log('\n✅ Seed complete!');
	console.log(`   Users:  ${result.usersInserted}`);
	console.log(`   Agents: ${result.agentsInserted}`);
	console.log(`   Tags:   ${result.tagsInserted}`);
	console.log(`   Setups: ${result.setupsInserted}`);
	console.log(`   Files:  ${result.filesInserted}`);

	return result;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('ERROR: DATABASE_URL environment variable is required');
		process.exit(1);
	}

	const client = postgres(databaseUrl, { max: 5 });
	const db = drizzle(client, { schema });

	try {
		await seed(db, { githubToken: process.env.GITHUB_TOKEN });
	} finally {
		await client.end();
	}
}

// Run when executed directly (not when imported for testing)
const isMain =
	typeof process !== 'undefined' &&
	process.argv[1] !== undefined &&
	(process.argv[1].endsWith('seed-dev.ts') || process.argv[1].endsWith('seed-dev.js'));

if (isMain) {
	main().catch((err) => {
		console.error('Seed failed:', err);
		process.exit(1);
	});
}
