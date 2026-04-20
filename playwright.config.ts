import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		env: { DISABLE_RATE_LIMIT: 'true' }
	},
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'mobile',
			use: {
				viewport: { width: 430, height: 932 },
				isMobile: true
			}
		}
	]
});
