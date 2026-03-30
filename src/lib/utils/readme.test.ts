import { describe, it, expect } from 'vitest';
import { generateReadme } from './readme';

describe('generateReadme', () => {
	it('includes the name as an H1 heading', () => {
		const result = generateReadme('My Setup', 'A cool setup', ['file.md']);
		expect(result).toMatch(/^# My Setup\n/);
	});

	it('includes the description in output', () => {
		const result = generateReadme('My Setup', 'A cool setup', []);
		expect(result).toContain('A cool setup');
	});

	it('includes all file paths as bullet points', () => {
		const result = generateReadme('My Setup', 'desc', [
			'.claude/settings.json',
			'CLAUDE.md',
			'scripts/build.sh'
		]);
		expect(result).toContain('- .claude/settings.json');
		expect(result).toContain('- CLAUDE.md');
		expect(result).toContain('- scripts/build.sh');
	});

	it('handles empty file list', () => {
		const result = generateReadme('My Setup', 'A setup', []);
		expect(result).toContain('## Files');
		expect(result).not.toMatch(/- .+/);
	});

	it('handles empty description', () => {
		const result = generateReadme('My Setup', '', ['file.md']);
		expect(result).toMatch(/^# My Setup\n/);
		expect(result).toContain('## Files');
		// No blank description paragraph
		expect(result).not.toMatch(/^# My Setup\n\n\n/);
	});

	it('handles special characters in name', () => {
		const result = generateReadme('Setup #1 (beta) & more', 'desc', []);
		expect(result).toContain('# Setup #1 (beta) & more');
	});

	it('handles special characters in description', () => {
		const result = generateReadme('Setup', 'Uses `code` and **bold** with <tags>', []);
		expect(result).toContain('Uses `code` and **bold** with <tags>');
	});

	it('includes Files section heading', () => {
		const result = generateReadme('My Setup', 'desc', ['a.md']);
		expect(result).toContain('## Files');
	});
});
