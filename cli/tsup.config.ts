import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	outDir: 'dist',
	// Bundle workspace packages into the output so the published package
	// has no workspace:* references in its dependencies
	noExternal: ['@coati/agents-registry', '@coati/validation']
});
