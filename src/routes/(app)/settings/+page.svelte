<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<h1>Settings</h1>
<p>Logged in as {data.user?.username}</p>
