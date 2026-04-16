import { env } from '$env/dynamic/public';

export function getEnvironment(): 'local' | 'test' | 'staging' | 'production' {
	if (process.env.NODE_ENV === 'test') return 'test';
	if (env.PUBLIC_ENV === 'staging') return 'staging';
	if (env.PUBLIC_ENV === 'production') return 'production';
	return 'local';
}
