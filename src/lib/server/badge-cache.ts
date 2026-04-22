import { LRUCache } from 'lru-cache';

const CACHE_MAX = 5_000;
const CACHE_TTL_MS = 5 * 60 * 1_000;

const cache = new LRUCache<string, string>({
	max: CACHE_MAX,
	ttl: CACHE_TTL_MS
});

export function getBadge(key: string): string | undefined {
	return cache.get(key);
}

export function setBadge(key: string, svg: string): void {
	cache.set(key, svg);
}

export { CACHE_MAX, CACHE_TTL_MS };
