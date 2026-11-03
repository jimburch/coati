import { describe, it, expect } from 'vitest';
import { buildHistory } from './revisions';

describe('buildHistory', () => {
	it('logs adds, changes, removals as null and re-adds, in Revision order', () => {
		const rows = [
			{ revision: 1, path: 'a', hash: 'a1' },
			{ revision: 1, path: 'b', hash: 'b1' },
			{ revision: 2, path: 'a', hash: 'a1' },
			{ revision: 3, path: 'a', hash: 'a2' },
			{ revision: 3, path: 'b', hash: 'b1' },
			{ revision: 4, path: 'a', hash: 'a2' },
			{ revision: 4, path: 'b', hash: 'b1' },
			{ revision: 4, path: 'c', hash: 'c1' }
		];
		expect(buildHistory([3, 1, 4, 2], rows)).toEqual({
			a: [
				{ revision: 1, hash: 'a1' },
				{ revision: 3, hash: 'a2' }
			],
			b: [
				{ revision: 1, hash: 'b1' },
				{ revision: 2, hash: null },
				{ revision: 3, hash: 'b1' }
			],
			c: [{ revision: 4, hash: 'c1' }]
		});
	});

	it('logs a removal only once while the path stays gone', () => {
		const rows = [
			{ revision: 1, path: 'a', hash: 'a1' },
			{ revision: 1, path: 'b', hash: 'b1' },
			{ revision: 2, path: 'b', hash: 'b1' },
			{ revision: 3, path: 'b', hash: 'b2' }
		];
		expect(buildHistory([1, 2, 3], rows).a).toEqual([
			{ revision: 1, hash: 'a1' },
			{ revision: 2, hash: null }
		]);
	});

	it('keeps an empty Revision as removing everything', () => {
		expect(buildHistory([1, 2], [{ revision: 1, path: 'a', hash: 'a1' }])).toEqual({
			a: [
				{ revision: 1, hash: 'a1' },
				{ revision: 2, hash: null }
			]
		});
	});
});
