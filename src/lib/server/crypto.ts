/** Hex-encode bytes. Matches Node's Buffer#toString('hex') for the same bytes. */
export function toHex(bytes: Uint8Array): string {
	let hex = '';
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, '0');
	}
	return hex;
}

/** `byteLength` random bytes as lowercase hex. 32 bytes → 64 hex chars. */
export function randomHex(byteLength: number): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return toHex(bytes);
}

/**
 * SHA-256 of the UTF-8 token, as lowercase hex.
 * Byte-identical to `createHash('sha256').update(token).digest('hex')`.
 */
export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return toHex(new Uint8Array(digest));
}
