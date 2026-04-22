import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LRUCache } from 'lru-cache';

// Use a fresh LRUCache instance in each test rather than the module singleton,
// so that tests are isolated and TTL / capacity behaviour can be verified
// without coupling to the shared cache state.
//
// lru-cache uses performance.now() internally, which vi.useFakeTimers() does
// not intercept by default. Passing `perf: { now: () => Date.now() }` routes
// all time reads through Date.now(), which IS mocked by vi.useFakeTimers().

describe('badge cache', () => {
	const MAX = 3;
	const TTL = 500; // ms
	let cache: LRUCache<string, string>;

	beforeEach(() => {
		vi.useFakeTimers();
		cache = new LRUCache<string, string>({
			max: MAX,
			ttl: TTL,
			perf: { now: () => Date.now() }
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('get returns the value set for a key (cache hit)', () => {
		cache.set('alice/my-setup', '<svg>available</svg>');
		expect(cache.get('alice/my-setup')).toBe('<svg>available</svg>');
	});

	it('get returns undefined for a key that was never set (cache miss)', () => {
		expect(cache.get('nobody/nothing')).toBeUndefined();
	});

	it('caches the unavailable SVG the same as the available SVG', () => {
		cache.set('alice/private', '<svg>unavailable</svg>');
		expect(cache.get('alice/private')).toBe('<svg>unavailable</svg>');
	});

	it('entry is undefined after the TTL has elapsed', () => {
		cache.set('alice/my-setup', '<svg>available</svg>');
		vi.advanceTimersByTime(TTL + 1);
		expect(cache.get('alice/my-setup')).toBeUndefined();
	});

	it('entry is still present before the TTL elapses', () => {
		cache.set('alice/my-setup', '<svg>available</svg>');
		vi.advanceTimersByTime(TTL - 1);
		expect(cache.get('alice/my-setup')).toBe('<svg>available</svg>');
	});

	it('evicts the least-recently-used entry when capacity is exceeded', () => {
		cache.set('a/1', 'svg1');
		cache.set('b/2', 'svg2');
		cache.set('c/3', 'svg3');
		// Access a/1 and b/2 to make c/3 the LRU
		cache.get('a/1');
		cache.get('b/2');
		// Adding a fourth entry evicts the LRU (c/3)
		cache.set('d/4', 'svg4');
		expect(cache.get('c/3')).toBeUndefined();
		expect(cache.get('a/1')).toBe('svg1');
		expect(cache.get('b/2')).toBe('svg2');
		expect(cache.get('d/4')).toBe('svg4');
	});

	it('getBadge / setBadge module exports behave consistently', async () => {
		// Import the real module to verify the exported API shape without mutating
		// the shared singleton (we just check the function signatures exist).
		const mod = await import('./badge-cache');
		expect(typeof mod.getBadge).toBe('function');
		expect(typeof mod.setBadge).toBe('function');
		expect(mod.CACHE_MAX).toBeGreaterThan(0);
		expect(mod.CACHE_TTL_MS).toBe(5 * 60 * 1_000);
	});
});
