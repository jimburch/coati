const CLI_UA_REGEX = /^@coati\/cli\/(\d+\.\d+\.\d+\S*)$/;

export function detectSurface(userAgent: string | null): {
	surface: 'web' | 'cli';
	cliVersion: string | null;
} {
	if (!userAgent) {
		return { surface: 'web', cliVersion: null };
	}

	const match = CLI_UA_REGEX.exec(userAgent);
	if (match) {
		return { surface: 'cli', cliVersion: match[1] };
	}

	return { surface: 'web', cliVersion: null };
}
