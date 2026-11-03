/**
 * Settings fragment selectors (spec §8):
 *
 *   selector := token ( '.' token | '[' token? '=' token ']' )*
 *
 * `.key` steps into an object, `[field=value]` picks the array element whose
 * `field` equals `value`, and `[=value]` picks a scalar array element. A token
 * that is empty or contains `.`, `[`, `]`, `=`, `#`, `"`, whitespace or a control
 * character is written as a JSON string. Only that canonical spelling parses.
 */
export type SelectorSegment =
	| { kind: 'key'; key: string }
	| { kind: 'match'; field: string; value: string }
	| { kind: 'value'; value: string };

export type Selector = readonly SelectorSegment[];

// Control characters are quoted too, so a selector never carries one raw.
// eslint-disable-next-line no-control-regex
const BARE_CHAR = /[^.[\]=#"\s\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex
const NEEDS_QUOTES = /[.[\]=#"\s\u0000-\u001f\u007f]/;

function formatToken(token: string): string {
	return token === '' || NEEDS_QUOTES.test(token) ? JSON.stringify(token) : token;
}

class SelectorSyntaxError extends Error {}

/** Parses a selector, or returns null if it isn't valid. */
export function parseSelector(text: string): Selector | null {
	let pos = 0;

	const fail = (): never => {
		throw new SelectorSyntaxError();
	};

	const expect = (ch: string): void => {
		if (text[pos] !== ch) fail();
		pos++;
	};

	const readQuoted = (): string => {
		const start = pos;
		pos++; // opening quote
		while (pos < text.length && text[pos] !== '"') {
			pos += text[pos] === '\\' ? 2 : 1;
		}
		expect('"');
		const raw = text.slice(start, pos);
		let value: string;
		try {
			value = JSON.parse(raw) as string;
		} catch {
			return fail();
		}
		// Only the canonical spelling is accepted, so one fragment has one path.
		if (formatToken(value) !== raw) fail();
		return value;
	};

	const readBare = (): string => {
		const start = pos;
		while (pos < text.length && BARE_CHAR.test(text[pos])) pos++;
		if (pos === start) fail();
		return text.slice(start, pos);
	};

	const readToken = (): string => (text[pos] === '"' ? readQuoted() : readBare());

	try {
		const segments: SelectorSegment[] = [{ kind: 'key', key: readToken() }];
		while (pos < text.length) {
			if (text[pos] === '.') {
				pos++;
				segments.push({ kind: 'key', key: readToken() });
			} else if (text[pos] === '[') {
				pos++;
				const field = text[pos] === '=' ? null : readToken();
				expect('=');
				const value = readToken();
				expect(']');
				segments.push(field === null ? { kind: 'value', value } : { kind: 'match', field, value });
			} else {
				fail();
			}
		}
		return segments;
	} catch (err) {
		if (err instanceof SelectorSyntaxError) return null;
		throw err;
	}
}

/** Writes a selector in canonical form: bare tokens where possible, JSON strings otherwise. */
export function formatSelector(selector: Selector): string {
	return selector
		.map((seg, i) => {
			switch (seg.kind) {
				case 'key':
					return (i === 0 ? '' : '.') + formatToken(seg.key);
				case 'match':
					return `[${formatToken(seg.field)}=${formatToken(seg.value)}]`;
				case 'value':
					return `[=${formatToken(seg.value)}]`;
			}
		})
		.join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ownValue(obj: Record<string, unknown>, key: string): unknown {
	return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

/**
 * Returns the value at `selector` in a parsed Settings file, or undefined when
 * nothing matches. A filter picks the first matching element, and a missing
 * field matches `""` (a hook group with no `matcher`).
 */
export function getAtSelector(tree: unknown, selector: Selector): unknown {
	let node = tree;
	for (const seg of selector) {
		if (seg.kind === 'key') {
			if (!isRecord(node)) return undefined;
			node = ownValue(node, seg.key);
		} else if (seg.kind === 'match') {
			if (!Array.isArray(node)) return undefined;
			node = node.find((el) => isRecord(el) && (ownValue(el, seg.field) ?? '') === seg.value);
		} else {
			if (!Array.isArray(node)) return undefined;
			node = node.find((el) => el === seg.value);
		}
		if (node === undefined) return undefined;
	}
	return node;
}

const WILDCARD = /^<[^<>]+>$/;

function tokenMatches(token: string, patternToken: string): boolean {
	return WILDCARD.test(patternToken) || token === patternToken;
}

/**
 * True when `selector` has the shape of a registry pattern such as
 * `mcpServers.<name>` or `hooks.<Event>[matcher=<m>].hooks[command=<cmd>]`.
 * A `<…>` token in the pattern matches any one token; everything else is literal.
 * Throws if the pattern itself isn't valid syntax, since patterns come from the registry.
 */
export function selectorMatchesPattern(selector: Selector, pattern: string): boolean {
	const parsed = parseSelector(pattern);
	if (!parsed) throw new Error(`Invalid selector pattern: ${pattern}`);
	if (parsed.length !== selector.length) return false;
	return parsed.every((p, i) => {
		const seg = selector[i];
		if (p.kind === 'key') return seg.kind === 'key' && tokenMatches(seg.key, p.key);
		if (p.kind === 'match') {
			return (
				seg.kind === 'match' && tokenMatches(seg.field, p.field) && tokenMatches(seg.value, p.value)
			);
		}
		return seg.kind === 'value' && tokenMatches(seg.value, p.value);
	});
}
