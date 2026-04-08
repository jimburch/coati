import pc from 'picocolors';

export type OutputMode = 'text' | 'json';

export interface ApiError {
	message: string;
	code?: string;
	url?: string;
	status?: number;
}

export interface TableColumn {
	header: string;
	key: string;
	/** Minimum column width. Defaults to header length. */
	minWidth?: number;
}

export interface OutputClient {
	setOutputMode(mode: OutputMode): void;
	setVerbose(enabled: boolean): void;
	isJsonMode(): boolean;
	isVerbose(): boolean;
	print(text: string): void;
	success(message: string): void;
	error(message: string): void;
	warning(message: string): void;
	info(message: string): void;
	json(data: unknown): void;
	apiError(err: ApiError): void;
	table(rows: Record<string, unknown>[], columns: TableColumn[]): void;
}

// ── Shared singleton state for non-context-aware consumers (e.g. prompts) ────

let _globalMode: OutputMode = 'text';

/** Returns true if the global output mode is JSON. Used by prompts.ts to guard
 *  against interactive prompts when running in --json mode. */
export function isJsonMode(): boolean {
	return _globalMode === 'json';
}

/** Create an output client with its own private mode/verbose state. */
export function createOutputClient(): OutputClient {
	let mode: OutputMode = 'text';
	let verbose = false;

	function printLine(text: string): void {
		if (mode === 'json') return;
		process.stdout.write(text + '\n');
	}

	return {
		setOutputMode(m: OutputMode): void {
			mode = m;
			_globalMode = m;
		},

		setVerbose(enabled: boolean): void {
			verbose = enabled;
		},

		isJsonMode(): boolean {
			return mode === 'json';
		},

		isVerbose(): boolean {
			return verbose;
		},

		json(data: unknown): void {
			process.stdout.write(JSON.stringify(data) + '\n');
		},

		print: printLine,

		success(message: string): void {
			printLine(pc.green('✓ ' + message));
		},

		error(message: string): void {
			if (mode === 'json') {
				process.stderr.write(JSON.stringify({ error: message }) + '\n');
			} else {
				process.stderr.write(pc.red('✗ ' + message) + '\n');
			}
		},

		warning(message: string): void {
			printLine(pc.yellow('⚠ ' + message));
		},

		info(message: string): void {
			printLine(pc.cyan('ℹ ' + message));
		},

		apiError(err: ApiError): void {
			if (verbose) {
				const lines: string[] = [pc.red('✗ ' + err.message)];
				if (err.url) lines.push(pc.dim('  URL:    ' + err.url));
				if (err.status !== undefined) lines.push(pc.dim('  Status: ' + err.status));
				if (err.code) lines.push(pc.dim('  Code:   ' + err.code));
				if (mode === 'json') {
					process.stderr.write(
						JSON.stringify({
							error: err.message,
							code: err.code,
							url: err.url,
							status: err.status
						}) + '\n'
					);
				} else {
					process.stderr.write(lines.join('\n') + '\n');
				}
			} else {
				if (mode === 'json') {
					process.stderr.write(JSON.stringify({ error: err.message }) + '\n');
				} else {
					process.stderr.write(pc.red('✗ ' + err.message) + '\n');
				}
			}
		},

		table(rows: Record<string, unknown>[], columns: TableColumn[]): void {
			if (mode === 'json') {
				process.stdout.write(JSON.stringify(rows) + '\n');
				return;
			}

			if (rows.length === 0) {
				printLine(pc.dim('No results.'));
				return;
			}

			// Compute column widths
			const widths = columns.map((col) => {
				const headerLen = col.header.length;
				const minLen = col.minWidth ?? headerLen;
				const maxDataLen = rows.reduce((max, row) => {
					const val = String(row[col.key] ?? '');
					return Math.max(max, val.length);
				}, 0);
				return Math.max(headerLen, minLen, maxDataLen);
			});

			const pad = (str: string, width: number): string => str.padEnd(width, ' ');

			// Header row
			const header = columns.map((col, i) => pc.bold(pad(col.header, widths[i]!))).join('  ');
			printLine(header);

			// Separator
			const separator = widths.map((w) => '─'.repeat(w)).join('  ');
			printLine(pc.dim(separator));

			// Data rows
			for (const row of rows) {
				const line = columns
					.map((col, i) => pad(String(row[col.key] ?? ''), widths[i]!))
					.join('  ');
				printLine(line);
			}
		}
	};
}
