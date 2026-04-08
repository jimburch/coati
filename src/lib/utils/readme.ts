export function generateReadme(name: string, description: string, filePaths: string[]): string {
	const lines: string[] = [];

	lines.push(`# ${name}`);
	lines.push('');

	if (description) {
		lines.push(description);
		lines.push('');
	}

	lines.push('## Files');
	lines.push('');

	for (const path of filePaths) {
		lines.push(`- ${path}`);
	}

	return lines.join('\n');
}
