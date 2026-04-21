import { defineConfig, devices } from '@playwright/test';

const STORAGE_STATE = 'playwright/.auth/user.json';

export default defineConfig({
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		env: { DISABLE_RATE_LIMIT: 'true' }
	},
	testMatch: '**/*.e2e.{ts,js}',
	retries: 1,
	projects: [
		{
			name: 'setup',
			testMatch: /tests\/auth\.setup\.ts/
		},
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: '**/*.auth.e2e.{ts,js}'
		},
		{
			name: 'mobile',
			use: {
				viewport: { width: 430, height: 932 },
				isMobile: true
			},
			testIgnore: '**/*.auth.e2e.{ts,js}'
		},
		{
			name: 'desktop-auth',
			use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
			testMatch: '**/*.auth.e2e.{ts,js}',
			dependencies: ['setup']
		},
		{
			name: 'mobile-auth',
			use: {
				viewport: { width: 430, height: 932 },
				isMobile: true,
				storageState: STORAGE_STATE
			},
			testMatch: '**/*.auth.e2e.{ts,js}',
			dependencies: ['setup']
		}
	]
});
