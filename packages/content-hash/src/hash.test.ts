import { describe, it, expect } from 'vitest';
import { hashFile, normalizeText } from './index.js';

// sha256("hello\n")
const HELLO_LF = '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03';

describe('normalizeText', () => {
	it('strips a leading BOM and turns CRLF and lone CR into LF', () => {
		expect(normalizeText('\uFEFFa\r\nb\rc\n')).toBe('a\nb\nc\n');
	});

	it('keeps a BOM that is not at the start', () => {
		expect(normalizeText('a\uFEFFb')).toBe('a\uFEFFb');
	});
});

describe('hashFile', () => {
	it('is the hex SHA-256 of the UTF-8 content', async () => {
		expect(await hashFile('hello\n')).toBe(HELLO_LF);
	});

	it.each([
		['CRLF', 'hello\r\n'],
		['CR', 'hello\r'],
		['BOM', '\uFEFFhello\n'],
		['BOM + CRLF', '\uFEFFhello\r\n']
	])('hashes the %s variant the same as LF', async (_label, variant) => {
		expect(await hashFile(variant)).toBe(HELLO_LF);
	});

	it('hashes non-ASCII text as UTF-8', async () => {
		expect(await hashFile('é')).toBe(
			'4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c'
		);
	});
});
