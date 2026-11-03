// Pure functions shared by the Coati server and CLI. Web Crypto only, no Node APIs.

export { normalizeText, hashFile, canonicalJson, hashFragment } from './hash.js';
export { hashSetupFile } from './setup-file.js';
export { parseSetupPath, formatSetupPath } from './setup-path.js';
export type { ParsedSetupPath } from './setup-path.js';
export {
	parseSelector,
	formatSelector,
	getAtSelector,
	selectorMatchesPattern
} from './selector.js';
export type { Selector, SelectorSegment } from './selector.js';
export { normalizeRemote, repoFingerprint } from './fingerprint.js';
