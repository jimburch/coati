import { hashFile, hashFragment } from './hash.js';
import { parseSetupPath } from './setup-path.js';

/**
 * The one hash function for a SetupFile (spec §3): a Settings fragment path
 * (`file#selector`) hashes its JSON value canonically, and anything else hashes
 * as a whole file. Server publish, the files endpoint and every CLI
 * classification go through here. Rejects an invalid path or fragment JSON.
 */
export async function hashSetupFile(path: string, content: string): Promise<string> {
	const parsed = parseSetupPath(path);
	if (!parsed) throw new Error(`Not a valid Setup path: ${path}`);
	return parsed.selector ? hashFragment(JSON.parse(content)) : hashFile(content);
}
