export type ThemePreference = 'light' | 'dark' | 'system';

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): 'light' | 'dark' {
	if (preference === 'light') return 'light';
	if (preference === 'dark') return 'dark';
	if (preference === 'system') return systemIsDark ? 'dark' : 'light';
	return 'dark';
}
