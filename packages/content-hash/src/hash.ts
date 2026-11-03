import canonicalize from 'canonicalize';

export async function sha256Hex(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Strips a leading BOM and turns CRLF and lone CR into LF. Used only as hash input. */
export function normalizeText(s: string): string {
	return s.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/** Hex SHA-256 of a whole file's normalized text. The stored content is never normalized. */
export function hashFile(content: string): Promise<string> {
	return sha256Hex(normalizeText(content));
}

/** RFC 8785 (JCS) canonical JSON. Throws if the value has no JSON form. */
export function canonicalJson(value: unknown): string {
	const json = canonicalize(value);
	if (json === undefined) throw new TypeError('Value has no canonical JSON form');
	return json;
}

/** Hex SHA-256 of a Settings fragment's canonical JSON, so formatting and key order never count as edits. */
export function hashFragment(value: unknown): Promise<string> {
	return sha256Hex(canonicalJson(value));
}
