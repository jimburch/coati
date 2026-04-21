/**
 * scripts/coverage.ts
 *
 * Wrapper around `vitest run --coverage` that optionally rewrites the
 * coverage badge in README.md when invoked with `--update`.
 *
 *   pnpm test:coverage            # just runs coverage
 *   pnpm test:coverage --update   # runs coverage, then updates the README badge
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const shouldUpdate = argv.includes('--update');
const vitestArgs = argv.filter((a) => a !== '--update');

const result = spawnSync('vitest', ['run', '--coverage', ...vitestArgs], {
	cwd: repoRoot,
	stdio: 'inherit',
	shell: false
});

if (result.status !== 0) process.exit(result.status ?? 1);

if (!shouldUpdate) process.exit(0);

const summaryPath = resolve(repoRoot, 'coverage/coverage-summary.json');
const readmePath = resolve(repoRoot, 'README.md');

type CoverageMetric = { pct: number };
type CoverageSummary = {
	total: {
		lines: CoverageMetric;
		statements: CoverageMetric;
		functions: CoverageMetric;
		branches: CoverageMetric;
	};
};

const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as CoverageSummary;
const pct = Math.round(summary.total.statements.pct);

// shields.io color thresholds, high → low
const color =
	pct >= 90
		? 'brightgreen'
		: pct >= 80
			? 'green'
			: pct >= 70
				? 'yellowgreen'
				: pct >= 60
					? 'yellow'
					: pct >= 50
						? 'orange'
						: 'red';

const newBadge = `[![Coverage](https://img.shields.io/badge/coverage-${pct}%25-${color})](./README.md)`;

const readme = readFileSync(readmePath, 'utf8');
const badgeRegex =
	/\[!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[^)]+\)\]\([^)]+\)/;

if (!badgeRegex.test(readme)) {
	console.error('coverage: could not find coverage badge line in README.md');
	process.exit(1);
}

const updated = readme.replace(badgeRegex, newBadge);
if (updated === readme) {
	console.log(`coverage: badge already at ${pct}%`);
} else {
	writeFileSync(readmePath, updated);
	console.log(`coverage: updated README badge to ${pct}% (${color})`);
}
