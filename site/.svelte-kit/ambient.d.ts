
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const NVM_INC: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const TERM_PROGRAM: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const NODE: string;
	export const NVM_CD_FLAGS: string;
	export const _P9K_TTY: string;
	export const INIT_CWD: string;
	export const DEV_PREFIX_FOR_AWS: string;
	export const SHELL: string;
	export const TERM: string;
	export const HOMEBREW_REPOSITORY: string;
	export const TMPDIR: string;
	export const TERM_PROGRAM_VERSION: string;
	export const VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
	export const MallocNanoZone: string;
	export const FIG_NEW_SESSION: string;
	export const ZDOTDIR: string;
	export const TERM_SESSION_ID: string;
	export const npm_config_registry: string;
	export const GPR_TOKEN: string;
	export const PNPM_HOME: string;
	export const ZSH: string;
	export const AWS_PAGER: string;
	export const GIT_EDITOR: string;
	export const NVM_DIR: string;
	export const USER: string;
	export const LS_COLORS: string;
	export const COMMAND_MODE: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const SSH_AUTH_SOCK: string;
	export const CLAUDE_CODE_SSE_PORT: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const VSCODE_PROFILE_INITIALIZED: string;
	export const TERM_FEATURES: string;
	export const npm_execpath: string;
	export const GOOGLE_CLOUD_PROJECT: string;
	export const PAGER: string;
	export const LSCOLORS: string;
	export const npm_config_frozen_lockfile: string;
	export const npm_config_verify_deps_before_run: string;
	export const DEV_AWS_ACCOUNT_ID: string;
	export const PATH: string;
	export const TERMINFO_DIRS: string;
	export const LaunchInstanceID: string;
	export const npm_config_engine_strict: string;
	export const npm_package_json: string;
	export const __CFBundleIdentifier: string;
	export const USER_ZDOTDIR: string;
	export const PWD: string;
	export const npm_command: string;
	export const VSCODE_NONCE: string;
	export const P9K_SSH: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const npm_config__jsr_registry: string;
	export const npm_lifecycle_event: string;
	export const LANG: string;
	export const P9K_TTY: string;
	export const npm_package_name: string;
	export const ITERM_PROFILE: string;
	export const NODE_PATH: string;
	export const XPC_FLAGS: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const MACH_PORT_RENDEZVOUS_PEER_VALDATION: string;
	export const npm_config_node_gyp: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_package_version: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const VSCODE_INJECTION: string;
	export const COLORFGBG: string;
	export const HOME: string;
	export const SHLVL: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const LC_TERMINAL_VERSION: string;
	export const HOMEBREW_PREFIX: string;
	export const ITERM_SESSION_ID: string;
	export const GK_GL_ADDR: string;
	export const LESS: string;
	export const LOGNAME: string;
	export const npm_lifecycle_script: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const GK_GL_PATH: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const NVM_BIN: string;
	export const npm_config_user_agent: string;
	export const HOMEBREW_CELLAR: string;
	export const INFOPATH: string;
	export const GIT_ASKPASS: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const LC_TERMINAL: string;
	export const _P9K_SSH_TTY: string;
	export const OSLogRateLimit: string;
	export const SECURITYSESSIONID: string;
	export const CLAUDECODE: string;
	export const COLORTERM: string;
	export const npm_node_execpath: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		NVM_INC: string;
		NoDefaultCurrentDirectoryInExePath: string;
		TERM_PROGRAM: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		NODE: string;
		NVM_CD_FLAGS: string;
		_P9K_TTY: string;
		INIT_CWD: string;
		DEV_PREFIX_FOR_AWS: string;
		SHELL: string;
		TERM: string;
		HOMEBREW_REPOSITORY: string;
		TMPDIR: string;
		TERM_PROGRAM_VERSION: string;
		VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
		MallocNanoZone: string;
		FIG_NEW_SESSION: string;
		ZDOTDIR: string;
		TERM_SESSION_ID: string;
		npm_config_registry: string;
		GPR_TOKEN: string;
		PNPM_HOME: string;
		ZSH: string;
		AWS_PAGER: string;
		GIT_EDITOR: string;
		NVM_DIR: string;
		USER: string;
		LS_COLORS: string;
		COMMAND_MODE: string;
		PNPM_SCRIPT_SRC_DIR: string;
		SSH_AUTH_SOCK: string;
		CLAUDE_CODE_SSE_PORT: string;
		__CF_USER_TEXT_ENCODING: string;
		VSCODE_PROFILE_INITIALIZED: string;
		TERM_FEATURES: string;
		npm_execpath: string;
		GOOGLE_CLOUD_PROJECT: string;
		PAGER: string;
		LSCOLORS: string;
		npm_config_frozen_lockfile: string;
		npm_config_verify_deps_before_run: string;
		DEV_AWS_ACCOUNT_ID: string;
		PATH: string;
		TERMINFO_DIRS: string;
		LaunchInstanceID: string;
		npm_config_engine_strict: string;
		npm_package_json: string;
		__CFBundleIdentifier: string;
		USER_ZDOTDIR: string;
		PWD: string;
		npm_command: string;
		VSCODE_NONCE: string;
		P9K_SSH: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		npm_config__jsr_registry: string;
		npm_lifecycle_event: string;
		LANG: string;
		P9K_TTY: string;
		npm_package_name: string;
		ITERM_PROFILE: string;
		NODE_PATH: string;
		XPC_FLAGS: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		MACH_PORT_RENDEZVOUS_PEER_VALDATION: string;
		npm_config_node_gyp: string;
		XPC_SERVICE_NAME: string;
		npm_package_version: string;
		pnpm_config_verify_deps_before_run: string;
		VSCODE_INJECTION: string;
		COLORFGBG: string;
		HOME: string;
		SHLVL: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		LC_TERMINAL_VERSION: string;
		HOMEBREW_PREFIX: string;
		ITERM_SESSION_ID: string;
		GK_GL_ADDR: string;
		LESS: string;
		LOGNAME: string;
		npm_lifecycle_script: string;
		VSCODE_GIT_IPC_HANDLE: string;
		GK_GL_PATH: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		NVM_BIN: string;
		npm_config_user_agent: string;
		HOMEBREW_CELLAR: string;
		INFOPATH: string;
		GIT_ASKPASS: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		LC_TERMINAL: string;
		_P9K_SSH_TTY: string;
		OSLogRateLimit: string;
		SECURITYSESSIONID: string;
		CLAUDECODE: string;
		COLORTERM: string;
		npm_node_execpath: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
