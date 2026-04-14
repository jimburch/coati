<script lang="ts">
	import { browser } from '$app/environment';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { resolveTheme, type ThemePreference } from '$lib/utils/theme';

	const VALID_THEMES: ThemePreference[] = ['light', 'dark', 'system'];

	function getStoredPreference(): ThemePreference {
		if (!browser) return 'dark';
		const cookie = document.cookie
			.split('; ')
			.find((c) => c.startsWith('theme='))
			?.split('=')[1];
		if (cookie && VALID_THEMES.includes(cookie as ThemePreference)) {
			return cookie as ThemePreference;
		}
		return 'dark';
	}

	function getSystemIsDark(): boolean {
		if (!browser) return true;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	let preference = $state<ThemePreference>(getStoredPreference());

	function applyTheme(pref: ThemePreference) {
		const resolved = resolveTheme(pref, getSystemIsDark());
		document.documentElement.classList.toggle('dark', resolved === 'dark');
	}

	function setPreference(pref: ThemePreference) {
		preference = pref;
		document.cookie = `theme=${pref};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
		applyTheme(pref);
	}

	// Listen for system theme changes when preference is 'system'
	$effect(() => {
		if (!browser) return;
		if (preference !== 'system') return;

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => applyTheme('system');
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	// Apply on mount
	$effect(() => {
		if (!browser) return;
		applyTheme(preference);
	});
</script>

<DropdownMenu>
	<DropdownMenuTrigger
		class={buttonVariants({ variant: 'ghost', size: 'icon' })}
		aria-label="Toggle theme"
	>
		{#if preference === 'light'}
			<!-- Sun icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="4" />
				<path
					d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
				/>
			</svg>
		{:else if preference === 'dark'}
			<!-- Moon icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		{:else}
			<!-- Monitor icon (system) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
			</svg>
		{/if}
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<DropdownMenuItem onclick={() => setPreference('light')}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="12" cy="12" r="4" />
				<path
					d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
				/>
			</svg>
			Light
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => setPreference('dark')}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
			Dark
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => setPreference('system')}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mr-2 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
			</svg>
			System
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
