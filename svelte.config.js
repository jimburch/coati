import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			config: 'wrangler.jsonc',
			platformProxy: {
				environment: 'dev',
				configPath: 'wrangler.jsonc',
				// Placeholder Hyperdrive IDs are not real Cloudflare resources.
				remoteBindings: false,
				persist: true
			}
		})
	},
	vitePlugin: {
		dynamicCompileOptions: () => ({ runes: true })
	}
};

export default config;
