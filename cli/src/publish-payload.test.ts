import { describe, it, expect } from 'vitest';
import { buildPublishPayload, OrgNotFoundError } from './publish-payload.js';
import type { TeamInfo, PublishFileContent } from './publish-payload.js';
import type { Manifest } from './manifest.js';

const FILE: PublishFileContent = {
	path: 'CLAUDE.md',
	componentType: 'instruction',
	content: 'hello'
};

const TEAMS: TeamInfo[] = [
	{ id: 'team-uuid-1', name: 'Acme Corp', slug: 'acme' },
	{ id: 'team-uuid-2', name: 'Beta Inc', slug: 'beta-inc' }
];

function makeManifest(overrides: Partial<Manifest> = {}): Manifest {
	return {
		name: 'my-setup',
		version: '1.0.0',
		description: 'A test setup',
		files: [{ path: 'CLAUDE.md', componentType: 'instruction' }],
		...overrides
	};
}

// ── personal setup ────────────────────────────────────────────────────────────

describe('buildPublishPayload — personal setup (no org)', () => {
	it('returns name, slug, description, files', () => {
		const payload = buildPublishPayload(makeManifest(), [], [FILE]);
		expect(payload.name).toBe('my-setup');
		expect(payload.slug).toBe('my-setup');
		expect(payload.description).toBe('A test setup');
		expect(payload.files).toEqual([FILE]);
	});

	it('omits teamId', () => {
		const payload = buildPublishPayload(makeManifest(), [], [FILE]);
		expect(payload).not.toHaveProperty('teamId');
	});

	it('includes visibility when set in manifest', () => {
		const payload = buildPublishPayload(makeManifest({ visibility: 'public' }), [], [FILE]);
		expect(payload.visibility).toBe('public');
	});

	it('includes private visibility when manifest has private', () => {
		const payload = buildPublishPayload(makeManifest({ visibility: 'private' }), [], [FILE]);
		expect(payload.visibility).toBe('private');
	});

	it('omits visibility when absent from manifest', () => {
		const payload = buildPublishPayload(makeManifest(), [], [FILE]);
		expect(payload).not.toHaveProperty('visibility');
	});

	it('includes display when present', () => {
		const payload = buildPublishPayload(makeManifest({ display: 'My Setup' }), [], [FILE]);
		expect(payload.display).toBe('My Setup');
	});

	it('includes category when present', () => {
		const payload = buildPublishPayload(makeManifest({ category: 'web-dev' }), [], [FILE]);
		expect(payload.category).toBe('web-dev');
	});
});

// ── team setup — matching org ─────────────────────────────────────────────────

describe('buildPublishPayload — team setup with matching org', () => {
	it('resolves org slug to teamId', () => {
		const payload = buildPublishPayload(makeManifest({ org: 'acme' }), TEAMS, [FILE]);
		expect(payload.teamId).toBe('team-uuid-1');
	});

	it('forces visibility to private when teamId is resolved', () => {
		const payload = buildPublishPayload(makeManifest({ org: 'acme' }), TEAMS, [FILE]);
		expect(payload.visibility).toBe('private');
	});

	it('forces visibility to private even when manifest has visibility: public', () => {
		const payload = buildPublishPayload(
			makeManifest({ org: 'acme', visibility: 'public' }),
			TEAMS,
			[FILE]
		);
		expect(payload.visibility).toBe('private');
	});

	it('resolves hyphenated org slug correctly', () => {
		const payload = buildPublishPayload(makeManifest({ org: 'beta-inc' }), TEAMS, [FILE]);
		expect(payload.teamId).toBe('team-uuid-2');
	});

	it('includes files in team payload', () => {
		const payload = buildPublishPayload(makeManifest({ org: 'acme' }), TEAMS, [FILE]);
		expect(payload.files).toEqual([FILE]);
	});
});

// ── team setup — unmatched org ────────────────────────────────────────────────

describe('buildPublishPayload — team setup with unmatched org', () => {
	it('throws OrgNotFoundError when org does not match any team', () => {
		expect(() => buildPublishPayload(makeManifest({ org: 'unknown-team' }), TEAMS, [FILE])).toThrow(
			OrgNotFoundError
		);
	});

	it('throws OrgNotFoundError with the missing slug', () => {
		try {
			buildPublishPayload(makeManifest({ org: 'unknown-team' }), TEAMS, [FILE]);
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(OrgNotFoundError);
			expect((e as OrgNotFoundError).slug).toBe('unknown-team');
		}
	});

	it('throws with message containing the slug', () => {
		expect(() => buildPublishPayload(makeManifest({ org: 'unknown-team' }), TEAMS, [FILE])).toThrow(
			'unknown-team'
		);
	});

	it('throws OrgNotFoundError when teamsList is empty', () => {
		expect(() => buildPublishPayload(makeManifest({ org: 'acme' }), [], [FILE])).toThrow(
			OrgNotFoundError
		);
	});
});

// ── team setup — forced private ───────────────────────────────────────────────

describe('buildPublishPayload — team setup visibility always private', () => {
	it('forces private when manifest has no visibility field', () => {
		const manifest = makeManifest({ org: 'acme' });
		delete manifest.visibility;
		const payload = buildPublishPayload(manifest, TEAMS, [FILE]);
		expect(payload.visibility).toBe('private');
	});

	it('forces private when manifest has visibility: private (no override needed)', () => {
		const payload = buildPublishPayload(
			makeManifest({ org: 'acme', visibility: 'private' }),
			TEAMS,
			[FILE]
		);
		expect(payload.visibility).toBe('private');
	});

	it('forces private when manifest has visibility: public (override happens)', () => {
		const payload = buildPublishPayload(
			makeManifest({ org: 'acme', visibility: 'public' }),
			TEAMS,
			[FILE]
		);
		expect(payload.visibility).toBe('private');
		expect(payload.teamId).toBeDefined();
	});
});
