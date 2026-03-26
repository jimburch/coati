<script lang="ts">
	function scrollToSignup() {
		document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<header class="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
	<nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
		<a href="/" class="text-xl font-bold tracking-tight text-primary">Coati</a>
		<button
			onclick={scrollToSignup}
			class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
		>
			Get early access
		</button>
	</nav>
</header>
