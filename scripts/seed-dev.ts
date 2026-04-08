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
import type { ComponentType, Category } from '@coati/validation';

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
	agent?: string;
}

export interface GeneratedSetup {
	name: string;
	slug: string;
	description: string;
	readme: string | null;
	category: Category | null;
	license: string | null;
	starsCount: number;
	clonesCount: number;
	files: GeneratedFile[];
	tagNames: string[];
	agentSlugs: string[];
}

export interface CommentGroup {
	setupId: string;
	userId: string;
	body: string;
	replies: Array<{ userId: string; body: string }>;
}

export interface SeedResult {
	usersInserted: number;
	agentsInserted: number;
	tagsInserted: number;
	setupsInserted: number;
	filesInserted: number;
	starsInserted: number;
	followsInserted: number;
	commentsInserted: number;
	activitiesInserted: number;
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
	// Agents
	'claude-code',
	'cursor',
	'copilot',
	'codex',
	'gemini-cli',
	'opencode',
	// Frameworks
	'nextjs',
	'sveltekit',
	'react',
	'django',
	'fastapi',
	'express',
	'flask',
	// Languages
	'typescript',
	'python',
	'rust',
	'go',
	// Workflows
	'tdd',
	'code-review',
	'ci-cd',
	'mcp',
	// Domains
	'web-dev',
	'data-science',
	'api',
	'devops',
	// Meta
	'multi-agent',
	'monorepo'
];

// ─── Stack Variations ─────────────────────────────────────────────────────────

interface StackParams {
	framework: string;
	language: string;
	projectType: string;
	projectName: string;
	testRunner: string;
	packageManager: string;
	linter: string;
}

const STACK_VARIATIONS: StackParams[] = [
	{
		framework: 'next',
		language: 'typescript',
		projectType: 'saas',
		projectName: 'acme-dashboard',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'sveltekit',
		language: 'typescript',
		projectType: 'saas',
		projectName: 'pulse-app',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'express',
		language: 'typescript',
		projectType: 'api',
		projectName: 'payments-service',
		testRunner: 'vitest',
		packageManager: 'npm',
		linter: 'eslint'
	},
	{
		framework: 'react',
		language: 'typescript',
		projectType: 'dashboard',
		projectName: 'analytics-ui',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'django',
		language: 'python',
		projectType: 'api',
		projectName: 'inventory-api',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'fastapi',
		language: 'python',
		projectType: 'api',
		projectName: 'ml-gateway',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'flask',
		language: 'python',
		projectType: 'api',
		projectName: 'webhook-receiver',
		testRunner: 'pytest',
		packageManager: 'pip',
		linter: 'ruff'
	},
	{
		framework: 'django',
		language: 'python',
		projectType: 'saas',
		projectName: 'tenant-portal',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'next',
		language: 'typescript',
		projectType: 'dashboard',
		projectName: 'admin-panel',
		testRunner: 'vitest',
		packageManager: 'npm',
		linter: 'eslint'
	},
	{
		framework: 'sveltekit',
		language: 'typescript',
		projectType: 'api',
		projectName: 'realtime-hub',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'express',
		language: 'typescript',
		projectType: 'api',
		projectName: 'auth-service',
		testRunner: 'jest',
		packageManager: 'npm',
		linter: 'eslint'
	},
	{
		framework: 'fastapi',
		language: 'python',
		projectType: 'api',
		projectName: 'data-pipeline',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'react',
		language: 'typescript',
		projectType: 'saas',
		projectName: 'collab-editor',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'next',
		language: 'typescript',
		projectType: 'api',
		projectName: 'storefront-api',
		testRunner: 'jest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'flask',
		language: 'python',
		projectType: 'dashboard',
		projectName: 'monitoring-dash',
		testRunner: 'pytest',
		packageManager: 'pip',
		linter: 'ruff'
	},
	{
		framework: 'axum',
		language: 'rust',
		projectType: 'api',
		projectName: 'edge-proxy',
		testRunner: 'cargo-test',
		packageManager: 'cargo',
		linter: 'clippy'
	},
	{
		framework: 'actix',
		language: 'rust',
		projectType: 'api',
		projectName: 'ingest-worker',
		testRunner: 'cargo-test',
		packageManager: 'cargo',
		linter: 'clippy'
	},
	{
		framework: 'gin',
		language: 'go',
		projectType: 'api',
		projectName: 'gateway-svc',
		testRunner: 'go-test',
		packageManager: 'go-mod',
		linter: 'golangci-lint'
	},
	{
		framework: 'chi',
		language: 'go',
		projectType: 'api',
		projectName: 'billing-api',
		testRunner: 'go-test',
		packageManager: 'go-mod',
		linter: 'golangci-lint'
	},
	{
		framework: 'react-native',
		language: 'typescript',
		projectType: 'mobile',
		projectName: 'field-notes',
		testRunner: 'jest',
		packageManager: 'npm',
		linter: 'eslint'
	},
	{
		framework: 'django',
		language: 'python',
		projectType: 'dashboard',
		projectName: 'crm-portal',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'next',
		language: 'typescript',
		projectType: 'saas',
		projectName: 'devtools-hub',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	},
	{
		framework: 'fastapi',
		language: 'python',
		projectType: 'api',
		projectName: 'search-index',
		testRunner: 'pytest',
		packageManager: 'uv',
		linter: 'ruff'
	},
	{
		framework: 'express',
		language: 'typescript',
		projectType: 'api',
		projectName: 'notification-svc',
		testRunner: 'vitest',
		packageManager: 'pnpm',
		linter: 'eslint'
	}
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

// ─── Content Generators ───────────────────────────────────────────────────────

function buildCmd(p: StackParams): string {
	if (p.language === 'python')
		return `${p.packageManager === 'uv' ? 'uv run' : 'python -m'} ${p.testRunner}`;
	if (p.language === 'rust') return 'cargo test';
	if (p.language === 'go') return 'go test ./...';
	return `${p.packageManager} ${p.packageManager === 'pnpm' || p.packageManager === 'npm' ? 'run ' : ''}test`;
}

function devCmd(p: StackParams): string {
	if (p.language === 'python')
		return `${p.packageManager === 'uv' ? 'uv run' : 'python'} manage.py runserver`;
	if (p.framework === 'next') return `${p.packageManager} run dev`;
	if (p.framework === 'sveltekit') return `${p.packageManager} run dev`;
	if (p.framework === 'express') return `${p.packageManager} run dev`;
	if (p.language === 'rust') return 'cargo run';
	if (p.language === 'go') return 'go run ./cmd/server';
	return `${p.packageManager} run dev`;
}

function lintCmd(p: StackParams): string {
	if (p.linter === 'ruff') return 'ruff check . --fix';
	if (p.linter === 'clippy') return 'cargo clippy --all-targets -- -D warnings';
	if (p.linter === 'golangci-lint') return 'golangci-lint run ./...';
	return `${p.packageManager} run lint`;
}

function generateClaudeMd(p: StackParams): string {
	const lines = [`# ${p.projectName}`, ''];

	if (p.language === 'typescript') {
		lines.push('## Tech Stack', '');
		lines.push(
			`- **Framework:** ${p.framework === 'next' ? 'Next.js (App Router)' : p.framework === 'sveltekit' ? 'SvelteKit' : p.framework === 'express' ? 'Express' : p.framework === 'react' ? 'React + Vite' : p.framework === 'react-native' ? 'React Native + Expo' : p.framework}`
		);
		lines.push('- **Language:** TypeScript (strict mode)');
		lines.push(`- **Package Manager:** ${p.packageManager}`);
		lines.push(`- **Testing:** ${p.testRunner}`);
		lines.push(`- **Linting:** ${p.linter} + prettier`);
		lines.push('');
		lines.push('## Commands', '');
		lines.push(`- \`${devCmd(p)}\` — start dev server`);
		lines.push(`- \`${buildCmd(p)}\` — run tests`);
		lines.push(`- \`${lintCmd(p)}\` — lint and fix`);
		lines.push(`- \`${p.packageManager} run build\` — production build`);
		lines.push('');
		lines.push('## Conventions', '');
		lines.push('- Use `const` over `let`; never use `var`');
		lines.push('- Prefer named exports over default exports');
		lines.push('- All functions must have explicit return types');
		lines.push('- Write tests for all new functions before implementation');
		lines.push('- Keep files under 300 lines; extract when they grow');
		if (p.framework === 'next') {
			lines.push('- Use Server Components by default; add `"use client"` only when needed');
			lines.push('- Data fetching happens in Server Components or Route Handlers');
			lines.push('- Use `next/image` for all images, `next/link` for navigation');
		} else if (p.framework === 'sveltekit') {
			lines.push('- Load data in `+page.server.ts` files, not in components');
			lines.push('- Use form actions for mutations, not fetch calls');
			lines.push('- Prefer `$derived` and `$state` runes over legacy reactive syntax');
		} else if (p.framework === 'express') {
			lines.push('- Validate all inputs with zod schemas at route boundaries');
			lines.push('- Return consistent JSON: `{ data }` on success, `{ error, code }` on failure');
			lines.push('- Use async/await with centralized error handling middleware');
		}
	} else if (p.language === 'python') {
		lines.push('## Tech Stack', '');
		lines.push(
			`- **Framework:** ${p.framework === 'django' ? 'Django' : p.framework === 'fastapi' ? 'FastAPI' : 'Flask'}`
		);
		lines.push('- **Language:** Python 3.12+');
		lines.push(`- **Package Manager:** ${p.packageManager}`);
		lines.push(`- **Testing:** ${p.testRunner}`);
		lines.push(`- **Linting:** ${p.linter} + mypy`);
		lines.push('');
		lines.push('## Commands', '');
		if (p.framework === 'django') {
			lines.push(
				`- \`${p.packageManager === 'uv' ? 'uv run' : 'python'} manage.py runserver\` — start dev server`
			);
			lines.push(`- \`${p.packageManager === 'uv' ? 'uv run' : 'python -m'} pytest\` — run tests`);
			lines.push(`- \`${lintCmd(p)}\` — lint`);
			lines.push(
				`- \`${p.packageManager === 'uv' ? 'uv run' : 'python'} manage.py migrate\` — apply migrations`
			);
		} else {
			lines.push(
				`- \`${p.packageManager === 'uv' ? 'uv run' : 'python -m'} ${p.framework === 'fastapi' ? 'uvicorn app.main:app --reload' : 'flask run --debug'}\` — start dev server`
			);
			lines.push(`- \`${buildCmd(p)}\` — run tests`);
			lines.push(`- \`${lintCmd(p)}\` — lint`);
		}
		lines.push('');
		lines.push('## Conventions', '');
		lines.push('- Use type hints on all function signatures');
		lines.push('- Prefer dataclasses or pydantic models over raw dicts');
		lines.push('- Write docstrings for public functions and classes');
		lines.push('- Tests live in `tests/` mirroring `src/` structure');
		if (p.framework === 'django') {
			lines.push('- Use Django ORM; avoid raw SQL unless necessary for performance');
			lines.push('- Fat models, thin views — business logic lives in model methods');
			lines.push('- Always create migrations for schema changes');
		} else if (p.framework === 'fastapi') {
			lines.push('- Use Pydantic v2 models for request/response validation');
			lines.push('- Dependency injection for database sessions and auth');
			lines.push('- Use async endpoints where possible');
		}
	} else if (p.language === 'rust') {
		lines.push('## Tech Stack', '');
		lines.push(`- **Framework:** ${p.framework === 'axum' ? 'Axum' : 'Actix Web'}`);
		lines.push('- **Language:** Rust (stable)');
		lines.push('- **Testing:** cargo test');
		lines.push('- **Linting:** clippy');
		lines.push('');
		lines.push('## Commands', '');
		lines.push('- `cargo run` — start server');
		lines.push('- `cargo test` — run tests');
		lines.push('- `cargo clippy --all-targets -- -D warnings` — lint');
		lines.push('- `cargo fmt --check` — check formatting');
		lines.push('');
		lines.push('## Conventions', '');
		lines.push('- Use `thiserror` for library errors, `anyhow` for application errors');
		lines.push('- Prefer `impl Trait` in argument position for flexibility');
		lines.push('- All public items must have doc comments');
		lines.push('- No `unwrap()` in production code; use `?` or explicit error handling');
	} else if (p.language === 'go') {
		lines.push('## Tech Stack', '');
		lines.push(`- **Framework:** ${p.framework === 'gin' ? 'Gin' : 'Chi'}`);
		lines.push('- **Language:** Go 1.22+');
		lines.push('- **Testing:** go test');
		lines.push('- **Linting:** golangci-lint');
		lines.push('');
		lines.push('## Commands', '');
		lines.push('- `go run ./cmd/server` — start server');
		lines.push('- `go test ./... -race -count=1` — run tests');
		lines.push('- `golangci-lint run ./...` — lint');
		lines.push('- `go vet ./...` — vet');
		lines.push('');
		lines.push('## Conventions', '');
		lines.push('- Follow standard Go project layout: `cmd/`, `internal/`, `pkg/`');
		lines.push('- Use `context.Context` as first parameter for all request-scoped functions');
		lines.push('- Table-driven tests with `t.Run` subtests');
		lines.push('- Wrap errors with `fmt.Errorf("op: %w", err)` for context');
	}

	return lines.join('\n') + '\n';
}

function generateCursorrules(p: StackParams): string {
	const lines: string[] = [];

	if (p.language === 'typescript') {
		lines.push(
			`You are working on ${p.projectName}, a ${p.projectType} built with ${p.framework === 'next' ? 'Next.js' : p.framework === 'react' ? 'React + Vite' : p.framework}.`
		);
		lines.push('');
		lines.push('## Code Style');
		lines.push('- TypeScript strict mode is enabled');
		lines.push('- Use functional components and hooks');
		lines.push('- Prefer `const` and arrow functions');
		lines.push('- All props must be typed with interfaces, not `type`');
		lines.push('- Use absolute imports from `@/`');
		lines.push('');
		lines.push('## Testing');
		lines.push(`- Use ${p.testRunner} for unit and integration tests`);
		lines.push('- Test files are colocated: `Component.test.tsx`');
		lines.push('- Write tests before implementation (TDD)');
		lines.push('');
		lines.push('## File Structure');
		if (p.framework === 'next') {
			lines.push('- `app/` — App Router pages and layouts');
			lines.push('- `components/` — Reusable UI components');
			lines.push('- `lib/` — Utilities and shared logic');
			lines.push('- `hooks/` — Custom React hooks');
		} else if (p.framework === 'react') {
			lines.push('- `src/components/` — Reusable UI components');
			lines.push('- `src/pages/` — Route-level components');
			lines.push('- `src/hooks/` — Custom hooks');
			lines.push('- `src/utils/` — Pure utility functions');
		}
	} else if (p.language === 'python') {
		lines.push(
			`You are working on ${p.projectName}, a ${p.framework === 'django' ? 'Django' : p.framework === 'fastapi' ? 'FastAPI' : 'Flask'} ${p.projectType}.`
		);
		lines.push('');
		lines.push('## Code Style');
		lines.push('- Python 3.12+ with type hints on all signatures');
		lines.push('- Use `ruff` for linting and formatting');
		lines.push('- Prefer dataclasses and pydantic models over raw dicts');
		lines.push('- Keep functions under 50 lines');
		lines.push('');
		lines.push('## Testing');
		lines.push('- Use pytest with fixtures');
		lines.push('- Test files in `tests/` mirroring source structure');
		lines.push('- Use `factory_boy` for test data');
		if (p.framework === 'django') {
			lines.push('');
			lines.push('## Django-Specific');
			lines.push('- Fat models, thin views');
			lines.push('- Use class-based views for CRUD');
			lines.push('- Always create and apply migrations for schema changes');
		}
	}

	return lines.join('\n') + '\n';
}

function generateCursorRule(p: StackParams, ruleName: string): string {
	const rules: Record<string, () => string> = {
		components: () => {
			if (p.language === 'python') {
				return [
					'---',
					`description: ${p.framework} view conventions`,
					`globs: ["**/views.py", "**/views/**/*.py"]`,
					'---',
					'',
					`# ${p.framework === 'django' ? 'Django' : p.framework} Views`,
					'',
					'- Use class-based views for CRUD operations',
					'- Keep views thin; delegate to services or model methods',
					'- Validate inputs at view boundaries',
					'- Return consistent response structures',
					''
				].join('\n');
			}
			return [
				'---',
				'description: Component conventions and patterns',
				`globs: ["**/*.tsx", "**/*.jsx"]`,
				'---',
				'',
				'# Component Rules',
				'',
				'- One component per file, named after the component',
				'- Props interface defined above the component',
				'- Use composition over prop drilling',
				`- Extract hooks to \`hooks/\` when reused across components`,
				'- Memoize expensive computations with `useMemo`',
				'- Event handlers prefixed with `handle`: `handleClick`, `handleSubmit`',
				''
			].join('\n');
		},
		testing: () => {
			if (p.language === 'python') {
				return [
					'---',
					'description: Testing conventions',
					`globs: ["tests/**/*.py"]`,
					'---',
					'',
					'# Testing Rules',
					'',
					`- Use ${p.testRunner} with fixtures for setup/teardown`,
					'- Name tests descriptively: `test_<thing>_<scenario>_<outcome>`',
					'- Use `factory_boy` for creating test objects',
					'- Mock external services at the boundary, not internal functions',
					'- Aim for integration tests over unit tests for views',
					''
				].join('\n');
			}
			return [
				'---',
				'description: Testing conventions',
				`globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"]`,
				'---',
				'',
				'# Testing Rules',
				'',
				`- Use ${p.testRunner} for all tests`,
				'- Test file colocated with source: `Component.test.tsx`',
				'- Use `describe` blocks to group related tests',
				'- Prefer `userEvent` over `fireEvent` for interaction tests',
				'- Mock at module boundaries, not internal functions',
				'- Each test should be independent and idempotent',
				''
			].join('\n');
		},
		style: () =>
			[
				'---',
				'description: Code style and formatting',
				`globs: ["**/*.ts", "**/*.tsx"]`,
				'---',
				'',
				'# Style Rules',
				'',
				'- Use `const` by default; `let` only when reassignment is needed',
				'- Prefer named exports over default exports',
				'- Destructure props in function parameters',
				'- Use template literals over string concatenation',
				'- Keep lines under 100 characters',
				'- Group imports: external, internal, types',
				''
			].join('\n'),
		models: () =>
			[
				'---',
				'description: Django model conventions',
				'globs: ["**/models.py", "**/models/**/*.py"]',
				'---',
				'',
				'# Model Rules',
				'',
				'- All models inherit from `TimeStampedModel` base class',
				'- Use explicit `related_name` on all ForeignKey fields',
				'- Add `__str__` method to every model',
				'- Keep business logic in model methods, not views',
				'- Always add database indexes for filtered/ordered fields',
				'- Use `choices` with TextChoices/IntegerChoices for enum fields',
				''
			].join('\n'),
		views: () =>
			[
				'---',
				'description: Django view patterns',
				'globs: ["**/views.py", "**/views/**/*.py", "**/api/**/*.py"]',
				'---',
				'',
				'# View Rules',
				'',
				'- Use DRF serializers for API views',
				'- Class-based views for standard CRUD',
				'- Function views for complex one-off endpoints',
				'- Always set `permission_classes` on API views',
				'- Use `select_related` and `prefetch_related` to avoid N+1 queries',
				'- Return 404 for missing resources, never empty 200',
				''
			].join('\n'),
		conventions: () => {
			if (p.language === 'python') {
				return [
					'---',
					'description: General coding conventions',
					`globs: ["**/*.py"]`,
					'---',
					'',
					'# Conventions',
					'',
					'- Type hints on all function signatures',
					'- Docstrings for all public functions and classes',
					'- Keep functions under 50 lines',
					'- Use pathlib for file system operations',
					'- Prefer generators for large data processing',
					''
				].join('\n');
			}
			return [
				'---',
				'description: General coding conventions',
				`globs: ["**/*.ts", "**/*.tsx"]`,
				'---',
				'',
				'# Conventions',
				'',
				`- This is a ${p.framework} ${p.projectType} project`,
				'- TypeScript strict mode is enabled',
				'- Use absolute imports via `@/` prefix',
				'- Error boundaries at route level',
				'- Validate all external inputs with zod',
				'- Log errors with structured metadata',
				''
			].join('\n');
		}
	};

	const fn = rules[ruleName];
	return fn ? fn() : `# ${ruleName}\n\nRule for ${ruleName}.\n`;
}

function generateCopilotInstructions(p: StackParams, variant: 'team' | 'oss'): string {
	if (variant === 'oss') {
		return [
			`# Contributing to ${p.projectName}`,
			'',
			'## Getting Started',
			'',
			`This project is a ${p.projectType} built with ${p.framework}. Contributions are welcome!`,
			'',
			'## Code Standards',
			'',
			`- ${p.language === 'typescript' ? 'TypeScript strict mode — no `any` types' : 'Type hints required on all functions'}`,
			`- Run \`${lintCmd(p)}\` before submitting`,
			`- Run \`${buildCmd(p)}\` and ensure all tests pass`,
			'- Write tests for all new features',
			'',
			'## Pull Request Guidelines',
			'',
			'- Keep PRs focused on a single change',
			'- Include a description of what changed and why',
			'- Link to the relevant issue if one exists',
			'- Wait for CI to pass before requesting review',
			''
		].join('\n');
	}

	return [
		`# ${p.projectName} — Team Coding Standards`,
		'',
		'## Overview',
		'',
		`This is a ${p.projectType} built with ${p.framework} (${p.language}).`,
		'',
		'## Code Style',
		'',
		...(p.language === 'typescript'
			? [
					'- TypeScript strict mode enabled',
					'- Use `const` by default',
					'- Prefer named exports',
					'- All functions must have explicit return types',
					`- Format with prettier, lint with ${p.linter}`
				]
			: [
					'- Python 3.12+ with full type annotations',
					`- Format and lint with ${p.linter}`,
					'- Use dataclasses or pydantic for structured data',
					'- Docstrings required for public APIs'
				]),
		'',
		'## Testing',
		'',
		`- Framework: ${p.testRunner}`,
		'- Write tests before implementation',
		'- Minimum 80% coverage for new code',
		`- Run: \`${buildCmd(p)}\``,
		'',
		'## Git Workflow',
		'',
		'- Branch from `main`, PR back to `main`',
		'- Squash merge all PRs',
		'- Conventional commit messages: `feat:`, `fix:`, `chore:`',
		''
	].join('\n');
}

function generateAgentsMd(p: StackParams): string {
	return [
		`# ${p.projectName}`,
		'',
		`This is a ${p.projectType} built with ${p.framework} (${p.language}).`,
		'',
		'## Development Workflow',
		'',
		`1. Install dependencies: \`${p.packageManager === 'npm' ? 'npm install' : p.packageManager === 'cargo' ? '' : `${p.packageManager} install`}\``,
		`2. Run tests: \`${buildCmd(p)}\``,
		`3. Lint: \`${lintCmd(p)}\``,
		'',
		'## Code Conventions',
		'',
		...(p.language === 'typescript'
			? [
					'- Strict TypeScript — no `any` types',
					'- Use async/await, never callbacks',
					'- Keep functions pure where possible',
					'- Validate inputs at boundaries with zod'
				]
			: p.language === 'rust'
				? [
						'- No `unwrap()` in production code',
						'- Use `thiserror` for custom errors',
						'- All public items documented',
						'- Run `cargo fmt` before committing'
					]
				: [
						'- Type hints on all functions',
						'- Use pathlib for file paths',
						'- Prefer composition over inheritance',
						'- Write integration tests for API endpoints'
					]),
		'',
		'## Architecture',
		'',
		...(p.framework === 'express' || p.framework === 'fastapi' || p.framework === 'django'
			? [
					'- `src/` — application source',
					'- `tests/` — test files',
					'- `scripts/` — operational scripts'
				]
			: p.language === 'rust'
				? ['- `src/` — library and binary crates', '- `tests/` — integration tests']
				: ['- `src/` — application source', '- `tests/` — test suite']),
		''
	].join('\n');
}

function generateGeminiMd(p: StackParams): string {
	return [
		`# ${p.projectName}`,
		'',
		`A ${p.projectType} built with ${p.framework} (${p.language}).`,
		'',
		'## Development',
		'',
		`- Start dev: \`${devCmd(p)}\``,
		`- Run tests: \`${buildCmd(p)}\``,
		`- Lint: \`${lintCmd(p)}\``,
		'',
		'## Guidelines',
		'',
		...(p.language === 'python'
			? [
					'- Use type hints on all signatures',
					'- Follow PEP 8 conventions',
					'- Write docstrings for public APIs',
					'- Use dataclasses for simple value objects',
					'- Use pydantic for validated data structures',
					'- Keep functions focused and under 40 lines'
				]
			: [
					'- Use TypeScript strict mode',
					'- Prefer functional patterns',
					'- Write tests before implementation',
					'- Keep modules small and focused'
				]),
		''
	].join('\n');
}

function generateOpencodeMd(p: StackParams): string {
	return [
		`# ${p.projectName}`,
		'',
		`A ${p.language} ${p.projectType} using ${p.framework}.`,
		'',
		'## Commands',
		'',
		`- Build: \`${p.language === 'go' ? 'go build ./cmd/server' : 'cargo build'}\``,
		`- Test: \`${buildCmd(p)}\``,
		`- Lint: \`${lintCmd(p)}\``,
		'',
		'## Conventions',
		'',
		...(p.language === 'go'
			? [
					'- Follow standard Go project layout',
					'- Use `context.Context` for request-scoped values',
					'- Table-driven tests with subtests',
					'- Wrap errors with `fmt.Errorf("context: %w", err)`',
					'- No global mutable state'
				]
			: [
					'- No `unwrap()` in production code',
					'- Use `?` operator for error propagation',
					'- Document all public items',
					'- Prefer zero-copy where practical'
				]),
		''
	].join('\n');
}

function generateMcpJson(p: StackParams): string {
	const servers: Record<string, unknown> = {};

	servers['filesystem'] = {
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-filesystem', '.']
	};

	if (
		p.language === 'typescript' &&
		(p.framework === 'next' || p.framework === 'sveltekit' || p.framework === 'express')
	) {
		servers['postgres'] = {
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: { DATABASE_URL: 'postgresql://localhost:5432/' + p.projectName }
		};
	}

	if (p.language === 'python' && (p.framework === 'django' || p.framework === 'fastapi')) {
		servers['postgres'] = {
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: { DATABASE_URL: 'postgresql://localhost:5432/' + p.projectName }
		};
	}

	return JSON.stringify({ mcpServers: servers }, null, '\t');
}

function generateCommandMd(p: StackParams, commandName: string): string {
	const commands: Record<string, () => string> = {
		dev: () =>
			[
				`# Start Development Server`,
				'',
				`Run the development server for ${p.projectName}.`,
				'',
				'```bash',
				devCmd(p),
				'```',
				''
			].join('\n'),
		test: () =>
			[
				'# Run Tests',
				'',
				`Run the full test suite for ${p.projectName}.`,
				'',
				'```bash',
				buildCmd(p),
				'```',
				'',
				'For a specific test file:',
				'```bash',
				p.language === 'python'
					? `${buildCmd(p)} tests/test_<module>.py -v`
					: p.language === 'rust'
						? 'cargo test <test_name>'
						: p.language === 'go'
							? 'go test ./internal/<package>/... -v'
							: `${p.packageManager} run test -- <file>`,
				'```',
				''
			].join('\n'),
		'review-pr': () =>
			[
				'# Review Pull Request',
				'',
				'Review the current PR against project standards.',
				'',
				'## Checklist',
				'',
				'1. Read the PR description and linked issue',
				'2. Check all tests pass',
				'3. Verify no `any` types or `TODO` comments',
				'4. Ensure consistent error handling',
				'5. Check for security issues (SQL injection, XSS, secrets)',
				'6. Verify naming conventions match project style',
				''
			].join('\n'),
		'db-migrate': () => {
			if (p.framework === 'django') {
				return [
					'# Database Migration',
					'',
					'Create and apply Django migrations.',
					'',
					'```bash',
					`${p.packageManager === 'uv' ? 'uv run' : 'python'} manage.py makemigrations`,
					`${p.packageManager === 'uv' ? 'uv run' : 'python'} manage.py migrate`,
					'```',
					''
				].join('\n');
			}
			return [
				'# Database Migration',
				'',
				'Generate and apply database migrations.',
				'',
				'```bash',
				`${p.packageManager} run db:generate`,
				`${p.packageManager} run db:migrate`,
				'```',
				''
			].join('\n');
		},
		venv: () =>
			[
				'# Setup Virtual Environment',
				'',
				'Create and activate a Python virtual environment.',
				'',
				'```bash',
				p.packageManager === 'uv'
					? 'uv venv && source .venv/bin/activate && uv pip install -r requirements.txt'
					: 'python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt',
				'```',
				''
			].join('\n'),
		build: () =>
			[
				'# Build',
				'',
				`Build ${p.projectName} for production.`,
				'',
				'```bash',
				p.language === 'rust'
					? 'cargo build --release'
					: p.language === 'go'
						? 'go build -o bin/server ./cmd/server'
						: `${p.packageManager} run build`,
				'```',
				''
			].join('\n'),
		typecheck: () =>
			[
				'# Type Check',
				'',
				'Run the TypeScript compiler to check types without emitting.',
				'',
				'```bash',
				`${p.packageManager} run tsc --noEmit`,
				'```',
				''
			].join('\n'),
		lint: () =>
			[
				'# Lint',
				'',
				`Run linting for ${p.projectName}.`,
				'',
				'```bash',
				lintCmd(p),
				'```',
				''
			].join('\n')
	};

	const fn = commands[commandName];
	return fn ? fn() : `# ${commandName}\n\nRun the ${commandName} command.\n`;
}

function generateSkillMd(p: StackParams, skillName: string): string {
	const skills: Record<string, () => string> = {
		tdd: () =>
			[
				'# TDD Workflow',
				'',
				'Follow the red-green-refactor loop:',
				'',
				'## Steps',
				'',
				'1. **Red** — Write a failing test that defines the expected behavior',
				`2. **Green** — Write the minimum code to make the test pass (\`${buildCmd(p)}\`)`,
				'3. **Refactor** — Clean up the code while keeping tests green',
				'',
				'## Rules',
				'',
				'- Never write production code without a failing test first',
				'- One assertion per test (or one logical concept)',
				'- Run the full suite after each refactor step',
				`- Use \`${buildCmd(p)}\` to verify`,
				''
			].join('\n'),
		testing: () => {
			if (p.language === 'python') {
				return [
					'# Testing Patterns',
					'',
					`Use ${p.testRunner} with fixtures for clean test setup.`,
					'',
					'## Structure',
					'',
					'```python',
					'@pytest.fixture',
					'def client(app):',
					'    return app.test_client()',
					'',
					'def test_endpoint_returns_200(client):',
					'    response = client.get("/api/health")',
					'    assert response.status_code == 200',
					'```',
					'',
					'## Conventions',
					'',
					'- Use `factory_boy` for model factories',
					'- Parametrize tests for multiple inputs',
					'- Use `freezegun` for time-dependent tests',
					'- Keep fixtures in `conftest.py`',
					''
				].join('\n');
			}
			return [
				'# Testing Patterns',
				'',
				`Use ${p.testRunner} for testing.`,
				'',
				'## Structure',
				'',
				'```typescript',
				"describe('feature', () => {",
				"  it('should handle the happy path', () => {",
				'    const result = doThing(input);',
				'    expect(result).toBe(expected);',
				'  });',
				'',
				"  it('should handle edge cases', () => {",
				'    expect(() => doThing(null)).toThrow();',
				'  });',
				'});',
				'```',
				'',
				'## Conventions',
				'',
				'- One `describe` per function/component',
				'- Test behavior, not implementation',
				'- Use `beforeEach` for shared setup',
				''
			].join('\n');
		},
		review: () =>
			[
				'# Code Review Skill',
				'',
				'When reviewing code, check these areas:',
				'',
				'## Correctness',
				'- Does the code do what the PR says it does?',
				'- Are edge cases handled?',
				'- Are error states handled gracefully?',
				'',
				'## Security',
				'- No hardcoded secrets or credentials',
				'- Input validation at boundaries',
				'- SQL injection / XSS prevention',
				'',
				'## Quality',
				'- Tests cover the new behavior',
				'- No unnecessary complexity',
				'- Naming is clear and consistent',
				'- No debug/console statements left behind',
				''
			].join('\n'),
		'api-design': () =>
			[
				'# API Design Patterns',
				'',
				`Patterns for building APIs in ${p.projectName}.`,
				'',
				'## Request Handling',
				'',
				...(p.language === 'typescript'
					? [
							'- Validate inputs with zod at the route boundary',
							'- Return `{ data }` on success, `{ error, code }` on failure',
							'- Use proper HTTP status codes (201 for create, 204 for delete)',
							'- Paginate list endpoints with `?page=1&limit=20`'
						]
					: [
							'- Validate inputs with pydantic models',
							'- Use consistent response shapes',
							'- Proper HTTP status codes',
							'- Paginate with `?offset=0&limit=20`'
						]),
				'',
				'## Error Handling',
				'',
				'- Catch errors at the handler level',
				'- Map domain errors to HTTP status codes',
				'- Log errors with request context',
				'- Never expose internal details in error responses',
				''
			].join('\n'),
		cargo: () =>
			[
				'# Cargo Workflow',
				'',
				'Standard Rust development workflow.',
				'',
				'## Build & Test',
				'',
				'```bash',
				'cargo build         # debug build',
				'cargo build --release  # release build',
				'cargo test          # run all tests',
				'cargo test -- --nocapture  # with stdout',
				'```',
				'',
				'## Quality',
				'',
				'```bash',
				'cargo clippy --all-targets -- -D warnings',
				'cargo fmt --check',
				'cargo doc --no-deps',
				'```',
				''
			].join('\n'),
		deploy: () =>
			[
				'# Deploy Skill',
				'',
				`Deployment steps for ${p.projectName}.`,
				'',
				'## Pre-deploy Checklist',
				'',
				`1. Run \`${buildCmd(p)}\` — all tests pass`,
				`2. Run \`${lintCmd(p)}\` — no lint errors`,
				'3. Check for uncommitted changes',
				'4. Verify environment variables are set',
				'',
				'## Deploy',
				'',
				'```bash',
				'git push origin main',
				'```',
				'',
				'CI/CD pipeline handles the rest.',
				''
			].join('\n'),
		'data-prep': () =>
			[
				'# Data Preparation',
				'',
				'Patterns for cleaning and preparing data.',
				'',
				'## Loading Data',
				'',
				'```python',
				'import pandas as pd',
				'',
				'df = pd.read_csv("data/raw/input.csv")',
				'df = df.dropna(subset=["required_column"])',
				'df["date"] = pd.to_datetime(df["date"])',
				'```',
				'',
				'## Validation',
				'',
				'- Check for null values in required columns',
				'- Verify data types match expected schema',
				'- Log row counts before and after transforms',
				'- Save processed data to `data/processed/`',
				''
			].join('\n')
	};

	const fn = skills[skillName];
	return fn ? fn() : `# ${skillName}\n\nSkill for ${skillName}.\n`;
}

function generateHookSh(p: StackParams, hookType: string): string {
	const hooks: Record<string, () => string> = {
		'pre-commit': () => {
			if (p.language === 'python') {
				return [
					'#!/bin/bash',
					'set -e',
					'',
					`echo "Running ${p.linter}..."`,
					lintCmd(p),
					'',
					'echo "Running type check..."',
					`${p.packageManager === 'uv' ? 'uv run' : 'python -m'} mypy .`,
					'',
					'echo "Pre-commit checks passed."',
					''
				].join('\n');
			}
			if (p.language === 'rust') {
				return [
					'#!/bin/bash',
					'set -e',
					'',
					'echo "Running clippy..."',
					'cargo clippy --all-targets -- -D warnings',
					'',
					'echo "Checking format..."',
					'cargo fmt --check',
					'',
					'echo "Pre-commit checks passed."',
					''
				].join('\n');
			}
			if (p.language === 'go') {
				return [
					'#!/bin/bash',
					'set -e',
					'',
					'echo "Running go vet..."',
					'go vet ./...',
					'',
					'echo "Running linter..."',
					'golangci-lint run ./...',
					'',
					'echo "Pre-commit checks passed."',
					''
				].join('\n');
			}
			return [
				'#!/bin/bash',
				'set -e',
				'',
				`echo "Running ${p.linter}..."`,
				lintCmd(p),
				'',
				'echo "Running type check..."',
				`${p.packageManager} run tsc --noEmit`,
				'',
				'echo "Pre-commit checks passed."',
				''
			].join('\n');
		},
		lint: () =>
			[
				'#!/bin/bash',
				'set -e',
				'',
				`echo "Running ${p.linter}..."`,
				lintCmd(p),
				'',
				'echo "Lint passed."',
				''
			].join('\n'),
		'pre-push': () =>
			[
				'#!/bin/bash',
				'set -e',
				'',
				'echo "Running full test suite..."',
				buildCmd(p),
				'',
				'echo "Running lint..."',
				lintCmd(p),
				'',
				'echo "Pre-push checks passed."',
				''
			].join('\n'),
		check: () =>
			[
				'#!/bin/bash',
				'set -e',
				'',
				`echo "Running checks for ${p.projectName}..."`,
				lintCmd(p),
				buildCmd(p),
				'',
				'echo "All checks passed."',
				''
			].join('\n')
	};

	const fn = hooks[hookType];
	return fn ? fn() : `#!/bin/bash\nset -e\necho "Running ${hookType}..."\n`;
}

function generateSettingsJson(p: StackParams, agent: string): string {
	if (agent === 'claude-code') {
		const settings: Record<string, unknown> = {
			permissions: {
				allow: [
					p.language === 'typescript' ? `${p.packageManager} run test` : buildCmd(p),
					lintCmd(p)
				],
				deny: ['rm -rf', 'git push --force']
			}
		};
		return JSON.stringify(settings, null, '\t');
	}
	if (agent === 'gemini') {
		return JSON.stringify(
			{ codeExecution: { enabled: true }, safetySettings: { threshold: 'BLOCK_ONLY_HIGH' } },
			null,
			'\t'
		);
	}
	if (agent === 'cursor') {
		return JSON.stringify(
			{
				'editor.formatOnSave': true,
				'editor.defaultFormatter': 'esbenp.prettier-vscode',
				'typescript.preferences.importModuleSpecifier': 'non-relative'
			},
			null,
			'\t'
		);
	}
	return JSON.stringify({}, null, '\t');
}

function generateVscodeSettings(p: StackParams): string {
	const settings: Record<string, unknown> = {
		'editor.formatOnSave': true,
		'editor.tabSize': p.language === 'python' ? 4 : 2
	};
	if (p.language === 'typescript') {
		settings['editor.defaultFormatter'] = 'esbenp.prettier-vscode';
		settings['typescript.preferences.importModuleSpecifier'] = 'non-relative';
	} else if (p.language === 'python') {
		settings['python.linting.enabled'] = true;
		settings['python.linting.ruffEnabled'] = true;
		settings['python.formatting.provider'] = 'none';
		settings['[python]'] = { 'editor.defaultFormatter': 'charliermarsh.ruff' };
	}
	return JSON.stringify(settings, null, '\t');
}

function generateCodexConfig(p: StackParams): string {
	const lines = ['[model]', 'provider = "anthropic"', ''];
	lines.push('[sandbox]');
	if (p.language === 'typescript') {
		lines.push(`allow_commands = ["${p.packageManager}", "npx", "node"]`);
	} else if (p.language === 'rust') {
		lines.push('allow_commands = ["cargo", "rustup"]');
	} else {
		lines.push(`allow_commands = ["${p.packageManager}", "python"]`);
	}
	lines.push('');
	return lines.join('\n');
}

function generateGeminiCommand(_p: StackParams, commandName: string): string {
	const commands: Record<string, string> = {
		dev: ['[command]', 'name = "dev"', 'description = "Start the development server"', ''].join(
			'\n'
		),
		train: [
			'[command]',
			'name = "train"',
			'description = "Run the training pipeline"',
			'',
			'[steps]',
			'pre = "echo Validating data..."',
			'run = "python -m src.train"',
			'post = "echo Training complete"',
			''
		].join('\n'),
		test: ['[command]', 'name = "test"', 'description = "Run the test suite"', ''].join('\n')
	};
	return commands[commandName] ?? `[command]\nname = "${commandName}"\n`;
}

function generateOpencodeJson(p: StackParams): string {
	return JSON.stringify(
		{
			model: 'anthropic/claude-sonnet',
			context: { cwd: '.', include: ['**/*.go', '**/*.mod', 'Makefile'] },
			tools: { shell: { allowed_commands: ['go', 'make', p.linter] } }
		},
		null,
		'\t'
	);
}

function generatePolicyMd(_p: StackParams, policyName: string): string {
	if (policyName === 'review-standards') {
		return [
			'# Code Review Standards',
			'',
			'All pull requests must meet these criteria:',
			'',
			'## Required',
			'',
			'- All CI checks pass (lint, test, build)',
			'- At least one approving review from a team member',
			'- No unresolved comments or conversations',
			'- Tests cover the new behavior',
			'- No `TODO` or `FIXME` without a linked issue',
			'',
			'## Security',
			'',
			'- No hardcoded secrets or API keys',
			'- Input validation on all user-facing endpoints',
			'- Dependencies reviewed for known vulnerabilities',
			'',
			'## Style',
			'',
			'- Consistent naming conventions',
			'- No unnecessary complexity or premature abstractions',
			'- Clear commit messages following conventional commits',
			''
		].join('\n');
	}
	return `# ${policyName}\n\nPolicy for ${policyName}.\n`;
}

function generateAgentDef(_p: StackParams, agentName: string): string {
	if (agentName === 'reviewer') {
		return [
			'# Code Reviewer Agent',
			'',
			'A specialized agent for thorough code review.',
			'',
			'## Capabilities',
			'',
			'- Read and analyze source files',
			'- Search for patterns across the codebase',
			'- Compare changes against project conventions',
			'',
			'## Tools',
			'',
			'- Read — read file contents',
			'- Grep — search for patterns',
			'- Glob — find files by pattern',
			'',
			'## Instructions',
			'',
			'When reviewing code:',
			'1. Read the full diff',
			'2. Check for correctness, security, and style',
			'3. Verify tests cover new behavior',
			'4. Flag any violations of project conventions',
			''
		].join('\n');
	}
	return `# ${agentName} Agent\n\nCustom agent for ${agentName}.\n`;
}

function generateSetupScript(p: StackParams): string {
	if (p.language === 'typescript') {
		return [
			'#!/bin/bash',
			'set -e',
			'',
			`echo "Setting up ${p.projectName}..."`,
			'',
			`# Install dependencies`,
			`${p.packageManager} install`,
			'',
			'# Setup environment',
			'if [ ! -f .env ]; then',
			'  cp .env.example .env',
			'  echo "Created .env from .env.example"',
			'fi',
			'',
			`echo "Setup complete. Run '${devCmd(p)}' to start."`,
			''
		].join('\n');
	}
	return [
		'#!/bin/bash',
		'set -e',
		'',
		`echo "Setting up ${p.projectName}..."`,
		'',
		`# Install dependencies`,
		p.packageManager === 'uv' ? 'uv sync' : `${p.packageManager} install -r requirements.txt`,
		'',
		`echo "Setup complete. Run '${devCmd(p)}' to start."`,
		''
	].join('\n');
}

function generateCopilotPromptMd(_p: StackParams, promptName: string): string {
	if (promptName === 'review') {
		return [
			'# Review Prompt',
			'',
			'Review the provided code changes for:',
			'',
			'1. **Correctness** — Does it do what it claims?',
			'2. **Tests** — Are new behaviors tested?',
			'3. **Security** — Any injection, XSS, or secret leaks?',
			'4. **Style** — Consistent with project conventions?',
			'5. **Performance** — Any obvious bottlenecks?',
			'',
			'Provide specific, actionable feedback.',
			''
		].join('\n');
	}
	return `# ${promptName}\n\nPrompt for ${promptName}.\n`;
}

function generateCopilotSetupSh(p: StackParams): string {
	return [
		'#!/bin/bash',
		'set -e',
		'',
		`echo "Configuring Copilot for ${p.projectName}..."`,
		'',
		'# Ensure VS Code settings are in place',
		'mkdir -p .vscode',
		'',
		'echo "Copilot setup complete."',
		''
	].join('\n');
}

function generateReadmeContent(
	p: StackParams,
	name: string,
	description: string,
	idx: number
): string | null {
	// 40% boilerplate
	if (idx % 5 < 2) {
		return `# ${name}\n\n${description}`;
	}

	// 60% custom with varying depth
	const depth = idx % 3; // 0 = short, 1 = medium, 2 = detailed

	const lines = [`# ${name}`, '', description, ''];

	if (depth >= 1) {
		lines.push("## What's Included", '');
		lines.push(
			`This setup configures your AI coding agent for working on ${p.framework} ${p.projectType} projects with ${p.language}. It includes:`
		);
		lines.push('');
		lines.push('- Agent instructions tailored to the framework and language');
		lines.push('- Custom commands for common development tasks');
		lines.push('- Pre-configured hooks for code quality');
		lines.push('');
	}

	if (depth >= 1) {
		lines.push('## Usage', '');
		lines.push('Clone this setup into your project:');
		lines.push('');
		lines.push('```bash');
		lines.push(`coati clone <owner>/${name.toLowerCase().replace(/\s+/g, '-')}`);
		lines.push('```');
		lines.push('');
	}

	if (depth >= 2) {
		lines.push('## Configuration', '');
		lines.push('After cloning, you may want to customize:');
		lines.push('');
		lines.push(
			'- **Instructions** — Update the project-specific details in the main instruction file'
		);
		lines.push('- **Commands** — Add or modify commands to match your workflow');
		lines.push('- **MCP Servers** — Configure database or API connections for your environment');
		lines.push('');
		lines.push('## Contributing', '');
		lines.push(
			'Found an issue or have an improvement? Star this setup and leave a comment with your suggestion.'
		);
		lines.push('');
	}

	return lines.join('\n');
}

// ─── Template Definitions ─────────────────────────────────────────────────────

interface AgentTemplate {
	name: string;
	baseSlug: string;
	description: string;
	category: Category;
	agentSlugs: string[];
	baseTags: string[];
	compatibleStackIndices: number[];
	generateFiles: (p: StackParams) => GeneratedFile[];
}

/** Indices into STACK_VARIATIONS by language/framework grouping */
const WEB_TS_INDICES = [0, 1, 2, 3, 8, 9, 10, 13, 22, 23]; // next, sveltekit, express, react
const PYTHON_INDICES = [4, 5, 6, 7, 11, 14, 20, 21]; // django, fastapi, flask
const RUST_INDICES = [15, 16]; // axum, actix
const GO_INDICES = [17, 18]; // gin, chi
const ALL_WEB_INDICES = [...WEB_TS_INDICES, ...PYTHON_INDICES];
function getTemplates(): AgentTemplate[] {
	return [
		// ── Claude Code (4) ───────────────────────────────────────────────
		{
			name: 'Claude Code Web Dev',
			baseSlug: 'claude-code-web-dev',
			description:
				'Full Claude Code setup for web development with commands, skills, hooks, and MCP servers.',
			category: 'web-dev',
			agentSlugs: ['claude-code'],
			baseTags: ['claude-code', 'web-dev'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'Project instructions and conventions',
					agent: 'claude-code'
				},
				{
					path: '.claude/settings.json',
					componentType: 'config',
					content: generateSettingsJson(p, 'claude-code'),
					description: 'Claude Code permission settings',
					agent: 'claude-code'
				},
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP server configuration',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/dev.md',
					componentType: 'command',
					content: generateCommandMd(p, 'dev'),
					description: 'Start the dev server',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/test.md',
					componentType: 'command',
					content: generateCommandMd(p, 'test'),
					description: 'Run the test suite',
					agent: 'claude-code'
				},
				{
					path: '.claude/skills/tdd/SKILL.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'tdd'),
					description: 'TDD red-green-refactor workflow',
					agent: 'claude-code'
				},
				{
					path: '.claude/hooks/pre-commit.sh',
					componentType: 'hook',
					content: generateHookSh(p, 'pre-commit'),
					description: 'Pre-commit lint and type check',
					agent: 'claude-code'
				}
			]
		},
		{
			name: 'Claude Code Python',
			baseSlug: 'claude-code-python',
			description:
				'Claude Code setup for Python projects with testing, linting, and virtual environment management.',
			category: 'data-science',
			agentSlugs: ['claude-code'],
			baseTags: ['claude-code', 'python'],
			compatibleStackIndices: PYTHON_INDICES,
			generateFiles: (p) => [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'Python project instructions',
					agent: 'claude-code'
				},
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP server configuration',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/venv.md',
					componentType: 'command',
					content: generateCommandMd(p, 'venv'),
					description: 'Setup virtual environment',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/test.md',
					componentType: 'command',
					content: generateCommandMd(p, 'test'),
					description: 'Run pytest',
					agent: 'claude-code'
				},
				{
					path: '.claude/skills/testing/SKILL.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'testing'),
					description: 'Python testing patterns',
					agent: 'claude-code'
				},
				{
					path: '.claude/hooks/lint.sh',
					componentType: 'hook',
					content: generateHookSh(p, 'lint'),
					agent: 'claude-code'
				}
			]
		},
		{
			name: 'Claude Code Review',
			baseSlug: 'claude-code-review',
			description:
				'Code review focused Claude Code setup with review skills, policies, and a custom reviewer agent.',
			category: 'general',
			agentSlugs: ['claude-code'],
			baseTags: ['claude-code', 'code-review'],
			compatibleStackIndices: ALL_WEB_INDICES,
			generateFiles: (p) => [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'Project instructions',
					agent: 'claude-code'
				},
				{
					path: '.claude/skills/review/SKILL.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'review'),
					description: 'Code review checklist and approach',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/review-pr.md',
					componentType: 'command',
					content: generateCommandMd(p, 'review-pr'),
					description: 'Review a pull request',
					agent: 'claude-code'
				},
				{
					path: '.claude/hooks/pre-push.sh',
					componentType: 'hook',
					content: generateHookSh(p, 'pre-push'),
					description: 'Pre-push test and lint',
					agent: 'claude-code'
				},
				{
					path: '.claude/policies/review-standards.md',
					componentType: 'policy',
					content: generatePolicyMd(p, 'review-standards'),
					description: 'Code review standards policy',
					agent: 'claude-code'
				},
				{
					path: '.claude/agents/reviewer.md',
					componentType: 'agent_def',
					content: generateAgentDef(p, 'reviewer'),
					description: 'Specialized code reviewer agent',
					agent: 'claude-code'
				}
			]
		},
		{
			name: 'Claude Code API',
			baseSlug: 'claude-code-api',
			description:
				'Claude Code setup for API development with database migrations, API design skills, and quality hooks.',
			category: 'web-dev',
			agentSlugs: ['claude-code'],
			baseTags: ['claude-code', 'api'],
			compatibleStackIndices: ALL_WEB_INDICES,
			generateFiles: (p) => [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'API project instructions',
					agent: 'claude-code'
				},
				{
					path: '.claude/settings.json',
					componentType: 'config',
					content: generateSettingsJson(p, 'claude-code'),
					description: 'Permission settings',
					agent: 'claude-code'
				},
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP servers for API development',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/db-migrate.md',
					componentType: 'command',
					content: generateCommandMd(p, 'db-migrate'),
					description: 'Database migration command',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/test.md',
					componentType: 'command',
					content: generateCommandMd(p, 'test'),
					agent: 'claude-code'
				},
				{
					path: '.claude/skills/api-design/SKILL.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'api-design'),
					description: 'API design patterns and conventions',
					agent: 'claude-code'
				},
				{
					path: '.claude/hooks/check.sh',
					componentType: 'hook',
					content: generateHookSh(p, 'check'),
					agent: 'claude-code'
				}
			]
		},

		// ── Cursor (3) ────────────────────────────────────────────────────
		{
			name: 'Cursor React',
			baseSlug: 'cursor-react',
			description: 'Cursor rules and commands for React and Next.js TypeScript development.',
			category: 'web-dev',
			agentSlugs: ['cursor'],
			baseTags: ['cursor', 'react', 'web-dev'],
			compatibleStackIndices: [0, 3, 8, 12, 13, 21],
			generateFiles: (p) => [
				{
					path: '.cursorrules',
					componentType: 'instruction',
					content: generateCursorrules(p),
					description: 'Cursor global rules',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/components.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'components'),
					description: 'Component conventions',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/testing.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'testing'),
					description: 'Testing conventions',
					agent: 'cursor'
				},
				{
					path: '.cursor/mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'Cursor MCP configuration',
					agent: 'cursor'
				},
				{
					path: '.cursor/commands/build.md',
					componentType: 'command',
					content: generateCommandMd(p, 'build'),
					description: 'Build for production',
					agent: 'cursor'
				}
			]
		},
		{
			name: 'Cursor Python Django',
			baseSlug: 'cursor-python-django',
			description: 'Cursor rules for Python Django development with model and view conventions.',
			category: 'web-dev',
			agentSlugs: ['cursor'],
			baseTags: ['cursor', 'python', 'django'],
			compatibleStackIndices: [4, 7, 20],
			generateFiles: (p) => [
				{
					path: '.cursorrules',
					componentType: 'instruction',
					content: generateCursorrules(p),
					description: 'Cursor rules for Django',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/models.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'models'),
					description: 'Django model conventions',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/views.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'views'),
					description: 'Django view patterns',
					agent: 'cursor'
				},
				{
					path: '.cursor/mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'Cursor MCP configuration',
					agent: 'cursor'
				}
			]
		},
		{
			name: 'Cursor TypeScript',
			baseSlug: 'cursor-typescript',
			description:
				'Cursor setup for TypeScript projects with style rules, testing conventions, and type checking.',
			category: 'web-dev',
			agentSlugs: ['cursor'],
			baseTags: ['cursor', 'typescript'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				{
					path: '.cursorrules',
					componentType: 'instruction',
					content: generateCursorrules(p),
					description: 'Cursor rules',
					agent: 'cursor'
				},
				{
					path: '.cursorignore',
					componentType: 'ignore',
					content: 'node_modules/\ndist/\nbuild/\n.next/\ncoverage/\n*.log\n',
					description: 'Files excluded from Cursor indexing',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/style.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'style'),
					description: 'Code style rules',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/testing.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'testing'),
					description: 'Testing rules',
					agent: 'cursor'
				},
				{
					path: '.cursor/commands/typecheck.md',
					componentType: 'command',
					content: generateCommandMd(p, 'typecheck'),
					description: 'Run type checking',
					agent: 'cursor'
				}
			]
		},

		// ── Copilot (2) ───────────────────────────────────────────────────
		{
			name: 'Copilot Team Standards',
			baseSlug: 'copilot-team-standards',
			description: 'GitHub Copilot configuration for team coding standards and conventions.',
			category: 'general',
			agentSlugs: ['copilot'],
			baseTags: ['copilot', 'code-review'],
			compatibleStackIndices: ALL_WEB_INDICES,
			generateFiles: (p) => [
				{
					path: '.github/copilot-instructions.md',
					componentType: 'instruction',
					content: generateCopilotInstructions(p, 'team'),
					description: 'Team coding standards for Copilot',
					agent: 'copilot'
				},
				{
					path: '.github/copilot/mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					agent: 'copilot'
				},
				{
					path: '.vscode/settings.json',
					componentType: 'config',
					content: generateVscodeSettings(p),
					description: 'VS Code settings'
				}
			]
		},
		{
			name: 'Copilot OSS Contributor',
			baseSlug: 'copilot-oss-contributor',
			description:
				'Copilot setup for open source projects with contributor guidelines and review prompts.',
			category: 'general',
			agentSlugs: ['copilot'],
			baseTags: ['copilot'],
			compatibleStackIndices: ALL_WEB_INDICES,
			generateFiles: (p) => [
				{
					path: '.github/copilot-instructions.md',
					componentType: 'instruction',
					content: generateCopilotInstructions(p, 'oss'),
					description: 'OSS contribution guidelines',
					agent: 'copilot'
				},
				{
					path: '.github/copilot/prompts/review.md',
					componentType: 'command',
					content: generateCopilotPromptMd(p, 'review'),
					description: 'Code review prompt',
					agent: 'copilot'
				},
				{
					path: '.github/copilot/setup.sh',
					componentType: 'hook',
					content: generateCopilotSetupSh(p),
					description: 'Copilot environment setup script',
					agent: 'copilot'
				}
			]
		},

		// ── Codex (2) ─────────────────────────────────────────────────────
		{
			name: 'Codex Node',
			baseSlug: 'codex-node',
			description:
				'Codex agent configuration for Node.js TypeScript projects with testing and deploy skills.',
			category: 'web-dev',
			agentSlugs: ['codex'],
			baseTags: ['codex', 'typescript'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				{
					path: 'AGENTS.md',
					componentType: 'instruction',
					content: generateAgentsMd(p),
					description: 'Codex agent instructions',
					agent: 'codex'
				},
				{
					path: '.codex/config.toml',
					componentType: 'config',
					content: generateCodexConfig(p),
					description: 'Codex sandbox configuration',
					agent: 'codex'
				},
				{
					path: '.agents/skills/testing.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'testing'),
					description: 'Testing patterns',
					agent: 'codex'
				},
				{
					path: '.agents/skills/deploy.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'deploy'),
					description: 'Deployment steps',
					agent: 'codex'
				}
			]
		},
		{
			name: 'Codex Rust',
			baseSlug: 'codex-rust',
			description: 'Codex agent setup for Rust projects with cargo workflow skills.',
			category: 'systems',
			agentSlugs: ['codex'],
			baseTags: ['codex', 'rust'],
			compatibleStackIndices: RUST_INDICES,
			generateFiles: (p) => [
				{
					path: 'AGENTS.md',
					componentType: 'instruction',
					content: generateAgentsMd(p),
					description: 'Rust project agent instructions',
					agent: 'codex'
				},
				{
					path: '.codex/config.toml',
					componentType: 'config',
					content: generateCodexConfig(p),
					description: 'Codex sandbox config',
					agent: 'codex'
				},
				{
					path: '.agents/skills/cargo.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'cargo'),
					description: 'Cargo build and test workflow',
					agent: 'codex'
				}
			]
		},

		// ── Gemini CLI (2) ────────────────────────────────────────────────
		{
			name: 'Gemini Web Dev',
			baseSlug: 'gemini-web-dev',
			description: 'Gemini CLI configuration for web development with commands and testing skills.',
			category: 'web-dev',
			agentSlugs: ['gemini'],
			baseTags: ['gemini-cli', 'web-dev'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				{
					path: 'GEMINI.md',
					componentType: 'instruction',
					content: generateGeminiMd(p),
					description: 'Gemini project instructions',
					agent: 'gemini'
				},
				{
					path: '.gemini/settings.json',
					componentType: 'config',
					content: generateSettingsJson(p, 'gemini'),
					description: 'Gemini settings',
					agent: 'gemini'
				},
				{
					path: '.gemini/commands/dev.toml',
					componentType: 'command',
					content: generateGeminiCommand(p, 'dev'),
					description: 'Start dev server',
					agent: 'gemini'
				},
				{
					path: '.gemini/skills/testing.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'testing'),
					description: 'Testing patterns',
					agent: 'gemini'
				}
			]
		},
		{
			name: 'Gemini Python ML',
			baseSlug: 'gemini-python-ml',
			description:
				'Gemini CLI setup for Python ML projects with training commands and data preparation skills.',
			category: 'data-science',
			agentSlugs: ['gemini'],
			baseTags: ['gemini-cli', 'python', 'data-science'],
			compatibleStackIndices: PYTHON_INDICES,
			generateFiles: (p) => [
				{
					path: 'GEMINI.md',
					componentType: 'instruction',
					content: generateGeminiMd(p),
					description: 'ML project instructions',
					agent: 'gemini'
				},
				{
					path: '.gemini/settings.json',
					componentType: 'config',
					content: generateSettingsJson(p, 'gemini'),
					description: 'Gemini settings',
					agent: 'gemini'
				},
				{
					path: '.gemini/commands/train.toml',
					componentType: 'command',
					content: generateGeminiCommand(p, 'train'),
					description: 'Run training pipeline',
					agent: 'gemini'
				},
				{
					path: '.gemini/skills/data-prep.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'data-prep'),
					description: 'Data preparation patterns',
					agent: 'gemini'
				}
			]
		},

		// ── OpenCode (1) ──────────────────────────────────────────────────
		{
			name: 'OpenCode Go',
			baseSlug: 'opencode-go',
			description: 'OpenCode configuration for Go microservices with build and test commands.',
			category: 'systems',
			agentSlugs: ['opencode'],
			baseTags: ['opencode', 'go'],
			compatibleStackIndices: GO_INDICES,
			generateFiles: (p) => [
				{
					path: 'opencode.md',
					componentType: 'instruction',
					content: generateOpencodeMd(p),
					description: 'Go project instructions',
					agent: 'opencode'
				},
				{
					path: '.opencode.json',
					componentType: 'config',
					content: generateOpencodeJson(p),
					description: 'OpenCode configuration',
					agent: 'opencode'
				},
				{
					path: '.opencode/commands/build.md',
					componentType: 'command',
					content: generateCommandMd(p, 'build'),
					description: 'Build the server',
					agent: 'opencode'
				},
				{
					path: '.opencode/commands/test.md',
					componentType: 'command',
					content: generateCommandMd(p, 'test'),
					description: 'Run tests',
					agent: 'opencode'
				}
			]
		},

		// ── Multi-agent (2) ───────────────────────────────────────────────
		{
			name: 'Multi-Agent Claude Cursor',
			baseSlug: 'multi-claude-cursor',
			description: 'Combined Claude Code and Cursor setup for TypeScript web projects.',
			category: 'web-dev',
			agentSlugs: ['claude-code', 'cursor'],
			baseTags: ['claude-code', 'cursor', 'multi-agent', 'web-dev'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'Claude Code instructions',
					agent: 'claude-code'
				},
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP server config for Claude',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/dev.md',
					componentType: 'command',
					content: generateCommandMd(p, 'dev'),
					agent: 'claude-code'
				},
				{
					path: '.cursorrules',
					componentType: 'instruction',
					content: generateCursorrules(p),
					description: 'Cursor rules',
					agent: 'cursor'
				},
				{
					path: '.cursor/mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP config for Cursor',
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/conventions.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'conventions'),
					description: 'Shared conventions',
					agent: 'cursor'
				},
				{
					path: 'scripts/setup.sh',
					componentType: 'setup_script',
					content: generateSetupScript(p),
					description: 'Project setup script'
				}
			]
		},
		{
			name: 'Multi-Agent Full Stack',
			baseSlug: 'multi-full-stack',
			description:
				'Comprehensive multi-agent setup with Claude Code, Copilot, and Cursor configured for the same project.',
			category: 'web-dev',
			agentSlugs: ['claude-code', 'copilot', 'cursor'],
			baseTags: ['claude-code', 'copilot', 'cursor', 'multi-agent', 'web-dev'],
			compatibleStackIndices: WEB_TS_INDICES,
			generateFiles: (p) => [
				// Claude Code files
				{
					path: 'CLAUDE.md',
					componentType: 'instruction',
					content: generateClaudeMd(p),
					description: 'Claude Code project instructions',
					agent: 'claude-code'
				},
				{
					path: '.claude/settings.json',
					componentType: 'config',
					content: generateSettingsJson(p, 'claude-code'),
					description: 'Claude permissions',
					agent: 'claude-code'
				},
				{
					path: '.mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					description: 'MCP servers',
					agent: 'claude-code'
				},
				{
					path: '.claude/commands/test.md',
					componentType: 'command',
					content: generateCommandMd(p, 'test'),
					agent: 'claude-code'
				},
				{
					path: '.claude/skills/tdd/SKILL.md',
					componentType: 'skill',
					content: generateSkillMd(p, 'tdd'),
					agent: 'claude-code'
				},
				{
					path: '.claude/hooks/pre-commit.sh',
					componentType: 'hook',
					content: generateHookSh(p, 'pre-commit'),
					agent: 'claude-code'
				},
				// Copilot files
				{
					path: '.github/copilot-instructions.md',
					componentType: 'instruction',
					content: generateCopilotInstructions(p, 'team'),
					description: 'Copilot team instructions',
					agent: 'copilot'
				},
				// Cursor files
				{
					path: '.cursorrules',
					componentType: 'instruction',
					content: generateCursorrules(p),
					description: 'Cursor rules',
					agent: 'cursor'
				},
				{
					path: '.cursor/mcp.json',
					componentType: 'mcp_server',
					content: generateMcpJson(p),
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/style.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'style'),
					agent: 'cursor'
				},
				{
					path: '.cursor/rules/testing.mdc',
					componentType: 'instruction',
					content: generateCursorRule(p, 'testing'),
					agent: 'cursor'
				},
				// Shared
				{
					path: '.vscode/settings.json',
					componentType: 'config',
					content: generateVscodeSettings(p),
					description: 'VS Code settings'
				},
				{
					path: 'scripts/setup.sh',
					componentType: 'setup_script',
					content: generateSetupScript(p),
					description: 'Project setup script'
				}
			]
		}
	];
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
	void seedAgents;
	const generated: Array<GeneratedSetup & { userId: string }> = [];
	const templates = getTemplates();

	// Ensure at least one user has no setups (edge case)
	const usersWithSetups = seedUsers.slice(0, -1);

	// Use sequential idx so all templates cycle evenly
	let idx = 0;
	for (let ui = 0; ui < usersWithSetups.length; ui++) {
		const user = usersWithSetups[ui];
		const numSetups = 3 + (ui % 3); // 3-5 setups per user

		for (let si = 0; si < numSetups; si++) {
			generated.push(buildSetup(user.id, user.username, idx, seedTags, templates));
			idx++;
		}
	}

	return generated;
}

function buildSetup(
	userId: string,
	_username: string,
	idx: number,
	seedTags: Array<{ id: string; name: string }>,
	templates: AgentTemplate[]
): GeneratedSetup & { userId: string } {
	const template = templates[idx % templates.length];

	// Select stack params from compatible stacks
	const compatIdx = idx % template.compatibleStackIndices.length;
	const stackIdx = template.compatibleStackIndices[compatIdx];
	const params = STACK_VARIATIONS[stackIdx];

	// Build name and slug with stack variation
	const frameworkLabel =
		params.framework === 'next'
			? 'nextjs'
			: params.framework === 'react-native'
				? 'react-native'
				: params.framework;
	const name = `${template.name} — ${frameworkLabel} ${params.language}`;
	const slug = `${template.baseSlug}-${frameworkLabel}-${idx}`;

	// Vary engagement: some highly starred (trending), some brand new
	const isTrending = idx % 7 === 0;
	const isNew = idx % 11 === 0;
	const starsCount = isTrending ? 50 + idx * 3 : isNew ? 0 : 2 + (idx % 20);
	const clonesCount = isTrending ? 200 + idx * 5 : isNew ? 0 : idx % 30;

	// Tags: template base tags + framework/language tags + extras
	const tagSet = new Set(template.baseTags);
	tagSet.add(params.language);
	if (
		['nextjs', 'sveltekit', 'react', 'django', 'fastapi', 'express', 'flask'].includes(
			frameworkLabel
		)
	) {
		tagSet.add(frameworkLabel);
	}
	// Add 0-2 extra tags based on idx
	const extraCount = idx % 3;
	const validTagNames = new Set(seedTags.map((t) => t.name));
	const extraTags = pick(seedTags, extraCount, idx * 7).map((t) => t.name);
	for (const t of extraTags) {
		tagSet.add(t);
	}
	// Filter to only valid tags
	const tagNames = [...tagSet].filter((t) => validTagNames.has(t));

	// Edge case: one setup with maximum tags
	const isMaxTags = idx === 3;
	const finalTagNames = isMaxTags
		? seedTags.slice(0, Math.min(seedTags.length, 10)).map((t) => t.name)
		: tagNames;

	// Edge case: very long description (near 300 char max)
	const longDesc = idx === 2;
	const description = longDesc
		? 'A comprehensive AI coding workflow setup that includes detailed instructions for TypeScript development, test-driven development practices, code review guidelines, and automated quality gates for modern web applications using the latest tools and frameworks.'
		: `${template.description} Configured for ${params.framework} ${params.language} ${params.projectType} projects.`.slice(
				0,
				300
			);

	// Generate files
	const files = template.generateFiles(params);

	// Generate readme
	const readme = generateReadmeContent(params, name, description, idx);

	return {
		userId,
		name,
		slug,
		description,
		readme,
		category: template.category,
		license: null,
		starsCount,
		clonesCount,
		files,
		tagNames: finalTagNames,
		agentSlugs: template.agentSlugs
	};
}

// ─── Social Data Constants ────────────────────────────────────────────────────

export const COMMENT_BODIES_SHORT = [
	'Great CLAUDE.md setup!',
	'Clean cursor rules.',
	'Love the MCP config.',
	'Solid workflow, starred.',
	'Nice agent setup!'
];

export const COMMENT_BODIES_MEDIUM = [
	'The TDD skill is really well structured. Adopted this for our team project.',
	"Your cursor rules handle edge cases I hadn't considered. Cloned and using it now.",
	'The MCP server config with filesystem + postgres combo is exactly what I needed.',
	'Great hook configuration. The pre-commit lint check caught issues on first use.',
	'This multi-agent setup works surprisingly well. Claude and Cursor complement each other.'
];

export const COMMENT_BODIES_LONG = [
	"I've been looking for a solid agent setup like this for months. The combination of strict project instructions, well-organized skills, and the pre-commit hooks is exactly what my team needs. We've been struggling with inconsistent AI workflows across different devs, and this provides a great foundation to standardize on. Starred and cloned.",
	"Really appreciate how you've organized the file structure here. Most setups I've seen either go too minimal with just an instruction file, or go overboard and become hard to maintain. This hits a nice balance. The MCP server integration for database access is particularly clever for API development.",
	"Used this setup across three projects now and it's been solid. The command definitions are clear and the skills are practical rather than theoretical. Only suggestion: consider adding a lint command alongside the test command. Otherwise, great contribution to the community!"
];

export const REPLY_BODIES = [
	'Agreed!',
	'Thanks for the feedback!',
	"Good point, I'll update it.",
	'Glad it worked for you!',
	'Appreciate that, will consider adding it.'
];

// ─── Social Data Generation ───────────────────────────────────────────────────

/**
 * Generate star rows for seeding. Stars are capped at the number of available
 * users (since each user can only star a setup once). Setups with starsCount=0
 * receive no stars.
 */
export function generateStars(
	seedSetups: Array<{ id: string; starsCount: number }>,
	seedUsers: Array<{ id: string }>
): Array<{ userId: string; setupId: string }> {
	const stars: Array<{ userId: string; setupId: string }> = [];
	const maxStarsPerSetup = seedUsers.length;

	for (const setup of seedSetups) {
		const starCount = Math.min(setup.starsCount, maxStarsPerSetup);
		for (let i = 0; i < starCount; i++) {
			stars.push({
				userId: seedUsers[i].id,
				setupId: setup.id
			});
		}
	}

	return stars;
}

/**
 * Generate follow relationships between users with realistic distribution.
 * Some users follow many others, some follow nobody. No self-follows, no
 * duplicates.
 */
export function generateFollows(
	seedUsers: Array<{ id: string }>
): Array<{ followerId: string; followingId: string }> {
	const follows: Array<{ followerId: string; followingId: string }> = [];
	const seen = new Set<string>();

	for (let i = 0; i < seedUsers.length; i++) {
		// Every 7th user follows nobody (realistic: some users are lurkers)
		if (i % 7 === 0) continue;

		// Users at multiples of 3 follow more people (more engaged users)
		const followCount = i % 3 === 0 ? Math.min(10, seedUsers.length - 1) : 1 + (i % 5);

		for (let j = 0; j < followCount; j++) {
			const targetIdx = (i + j + 1) % seedUsers.length;
			const followerId = seedUsers[i].id;
			const followingId = seedUsers[targetIdx].id;

			if (followerId === followingId) continue;

			const key = `${followerId}:${followingId}`;
			if (!seen.has(key)) {
				seen.add(key);
				follows.push({ followerId, followingId });
			}
		}
	}

	return follows;
}

/**
 * Generate comment groups (top-level comments + replies) for seeding.
 * Some setups get no comments. Varying body lengths and tones.
 */
export function generateCommentGroups(
	seedSetups: Array<{ id: string }>,
	seedUsers: Array<{ id: string }>
): CommentGroup[] {
	const groups: CommentGroup[] = [];
	const allBodies = [...COMMENT_BODIES_SHORT, ...COMMENT_BODIES_MEDIUM, ...COMMENT_BODIES_LONG];

	for (let si = 0; si < seedSetups.length; si++) {
		// Every 5th setup gets no comments (realistic: new/niche setups)
		if (si % 5 === 4) continue;

		const setup = seedSetups[si];
		const commentCount = 1 + (si % 4); // 1-4 top-level comments per setup

		for (let ci = 0; ci < commentCount; ci++) {
			const userId = seedUsers[(si + ci) % seedUsers.length].id;
			const body = allBodies[(si * 3 + ci) % allBodies.length];

			// Every 3rd top-level comment gets a reply
			const replies: Array<{ userId: string; body: string }> = [];
			if (ci % 3 === 0 && seedUsers.length > 1) {
				const replyUserId = seedUsers[(si + ci + 1) % seedUsers.length].id;
				replies.push({
					userId: replyUserId,
					body: REPLY_BODIES[(si + ci) % REPLY_BODIES.length]
				});
			}

			groups.push({ setupId: setup.id, userId, body, replies });
		}
	}

	return groups;
}

/** Returns a deterministic past timestamp spread over the last rangeDays days. */
function seedTimestamp(index: number, baseDateMs: number, rangeDays = 30): Date {
	const rangeMs = rangeDays * 24 * 60 * 60 * 1000;
	// Use a large prime for good distribution across the range
	const offset = (index * 7919) % rangeMs;
	return new Date(baseDateMs - offset);
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
	await db.execute(sql`
		DO $$ DECLARE t text;
		BEGIN
			FOR t IN
				SELECT tablename FROM pg_tables
				WHERE schemaname = 'public' AND tablename != '__drizzle_migrations'
			LOOP
				EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
			END LOOP;
		END $$
	`);
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
				description: f.description ?? null,
				agent: f.agent ?? null
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

	// 8. Social graph: stars, follows, comments, activities
	console.log('\n→ Inserting social graph...');
	const baseDateMs = Date.now();
	const activityRows: Array<typeof schema.activities.$inferInsert> = [];
	let activityIdx = 0;

	// 8a. Stars
	const starDataRows = generateStars(insertedSetups, insertedUsers);
	if (starDataRows.length > 0) {
		await db.insert(schema.stars).values(starDataRows);
	}
	// Update starsCount to match actual rows (cap may differ from generated value)
	const starCountBySetup = new Map<string, number>();
	for (const row of starDataRows) {
		starCountBySetup.set(row.setupId, (starCountBySetup.get(row.setupId) ?? 0) + 1);
	}
	for (const setup of insertedSetups) {
		await db
			.update(schema.setups)
			.set({ starsCount: starCountBySetup.get(setup.id) ?? 0 })
			.where(sql`id = ${setup.id}`);
	}
	// Collect star activities
	for (let i = 0; i < starDataRows.length; i++) {
		activityRows.push({
			userId: starDataRows[i].userId,
			setupId: starDataRows[i].setupId,
			actionType: 'starred_setup',
			createdAt: seedTimestamp(activityIdx++, baseDateMs)
		});
	}
	console.log(`  ✓ Inserted ${starDataRows.length} stars`);

	// 8b. Follows
	const followDataRows = generateFollows(insertedUsers);
	if (followDataRows.length > 0) {
		await db.insert(schema.follows).values(followDataRows);
	}
	// Update follower/following denormalized counts
	for (const user of insertedUsers) {
		const followerCount = followDataRows.filter((f) => f.followingId === user.id).length;
		const followingCount = followDataRows.filter((f) => f.followerId === user.id).length;
		await db
			.update(schema.users)
			.set({ followersCount: followerCount, followingCount: followingCount })
			.where(sql`id = ${user.id}`);
	}
	// Collect follow activities
	for (let i = 0; i < followDataRows.length; i++) {
		activityRows.push({
			userId: followDataRows[i].followerId,
			targetUserId: followDataRows[i].followingId,
			actionType: 'followed_user',
			createdAt: seedTimestamp(activityIdx++, baseDateMs)
		});
	}
	console.log(`  ✓ Inserted ${followDataRows.length} follows`);

	// 8c. Comments (two-pass: top-level first, then replies with real parentIds)
	const commentGroups = generateCommentGroups(insertedSetups, insertedUsers);
	let totalComments = 0;
	const commentCountBySetup = new Map<string, number>();

	for (const group of commentGroups) {
		const [topLevel] = await db
			.insert(schema.comments)
			.values({ setupId: group.setupId, userId: group.userId, body: group.body })
			.returning({ id: schema.comments.id });
		totalComments++;
		activityRows.push({
			userId: group.userId,
			setupId: group.setupId,
			commentId: topLevel.id,
			actionType: 'commented',
			createdAt: seedTimestamp(activityIdx++, baseDateMs)
		});

		for (const reply of group.replies) {
			await db.insert(schema.comments).values({
				setupId: group.setupId,
				userId: reply.userId,
				body: reply.body,
				parentId: topLevel.id
			});
			totalComments++;
			activityRows.push({
				userId: reply.userId,
				setupId: group.setupId,
				actionType: 'commented',
				createdAt: seedTimestamp(activityIdx++, baseDateMs)
			});
		}

		commentCountBySetup.set(
			group.setupId,
			(commentCountBySetup.get(group.setupId) ?? 0) + 1 + group.replies.length
		);
	}
	// Update commentsCount on setups
	for (const setup of insertedSetups) {
		await db
			.update(schema.setups)
			.set({ commentsCount: commentCountBySetup.get(setup.id) ?? 0 })
			.where(sql`id = ${setup.id}`);
	}
	console.log(`  ✓ Inserted ${totalComments} comments`);

	// 8d. created_setup activities (one per setup by its owner)
	for (let i = 0; i < insertedSetups.length; i++) {
		const setup = insertedSetups[i];
		activityRows.push({
			userId: setup.userId,
			setupId: setup.id,
			actionType: 'created_setup',
			// Spread setup creation over past 60 days
			createdAt: seedTimestamp(i, baseDateMs, 60)
		});
	}

	// 8e. cloned_setup activities — some users cloning some setups
	for (let i = 0; i < insertedSetups.length; i++) {
		if (i % 4 === 0) continue; // skip every 4th setup (no clones)
		const clonerIdx = (i + insertedUsers.length - 1) % insertedUsers.length;
		activityRows.push({
			userId: insertedUsers[clonerIdx].id,
			setupId: insertedSetups[i].id,
			actionType: 'cloned_setup',
			createdAt: seedTimestamp(activityIdx++, baseDateMs, 14)
		});
	}

	// 8f. Insert all activities
	if (activityRows.length > 0) {
		await db.insert(schema.activities).values(activityRows);
	}
	console.log(`  ✓ Inserted ${activityRows.length} activities`);

	const result: SeedResult = {
		usersInserted: insertedUsers.length,
		agentsInserted: insertedAgents.length,
		tagsInserted: insertedTags.length,
		setupsInserted: insertedSetups.length,
		filesInserted: totalFiles,
		starsInserted: starDataRows.length,
		followsInserted: followDataRows.length,
		commentsInserted: totalComments,
		activitiesInserted: activityRows.length
	};

	console.log('\n✅ Seed complete!');
	console.log(`   Users:      ${result.usersInserted}`);
	console.log(`   Agents:     ${result.agentsInserted}`);
	console.log(`   Tags:       ${result.tagsInserted}`);
	console.log(`   Setups:     ${result.setupsInserted}`);
	console.log(`   Files:      ${result.filesInserted}`);
	console.log(`   Stars:      ${result.starsInserted}`);
	console.log(`   Follows:    ${result.followsInserted}`);
	console.log(`   Comments:   ${result.commentsInserted}`);
	console.log(`   Activities: ${result.activitiesInserted}`);

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
