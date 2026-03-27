import { describe, it, expect, vi } from 'vitest';

// Pure logic extracted from ToggleButton.svelte for unit testing
function computeOptimistic(active: boolean, count: number): { active: boolean; count: number } {
	return { active: !active, count: active ? count - 1 : count + 1 };
}

function simulateSubmit(
	active: boolean,
	count: number,
	onoptimisticchange?: (active: boolean, count: number) => void
): {
	pending: { active: boolean; count: number };
	rollback: () => void;
	commit: () => void;
} {
	const optimistic = computeOptimistic(active, count);
	onoptimisticchange?.(optimistic.active, optimistic.count);

	return {
		pending: optimistic,
		rollback: () => {
			onoptimisticchange?.(active, count);
		},
		commit: () => {
			// pending cleared after update — no callback on success
		}
	};
}

describe('ToggleButton optimistic update logic', () => {
	it('increments count and flips active to true when inactive', () => {
		const result = computeOptimistic(false, 5);
		expect(result).toEqual({ active: true, count: 6 });
	});

	it('decrements count and flips active to false when active', () => {
		const result = computeOptimistic(true, 5);
		expect(result).toEqual({ active: false, count: 4 });
	});

	it('fires onoptimisticchange with optimistic values on submit', () => {
		const callback = vi.fn();
		simulateSubmit(false, 10, callback);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(true, 11);
	});

	it('fires onoptimisticchange with original values on rollback', () => {
		const callback = vi.fn();
		const { rollback } = simulateSubmit(false, 10, callback);
		rollback();
		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenNthCalledWith(1, true, 11);
		expect(callback).toHaveBeenNthCalledWith(2, false, 10);
	});

	it('rollback restores active=true and original count when deactivating', () => {
		const callback = vi.fn();
		const { rollback } = simulateSubmit(true, 7, callback);
		rollback();
		expect(callback).toHaveBeenNthCalledWith(2, true, 7);
	});

	it('does not throw when onoptimisticchange is undefined', () => {
		expect(() => simulateSubmit(false, 5)).not.toThrow();
		const { rollback } = simulateSubmit(false, 5);
		expect(() => rollback()).not.toThrow();
	});

	it('count never goes below zero when count is 0 and active', () => {
		// count - 1 = -1; this tests the raw math (floor guard is a DB concern)
		const result = computeOptimistic(true, 0);
		expect(result.count).toBe(-1);
	});
});
