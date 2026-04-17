<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

	type Props = {
		username: string;
		avatarUrl: string;
		name: string | null;
	};

	const { username, avatarUrl, name }: Props = $props();

	const displayName = $derived(name ?? username);
	const initials = $derived(displayName[0]?.toUpperCase() ?? '?');
</script>

<a
	href="/{username}"
	class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
>
	<Avatar class="size-12 shrink-0 text-base">
		<AvatarImage src={avatarUrl} alt={displayName} />
		<AvatarFallback>{initials}</AvatarFallback>
	</Avatar>
	<div class="min-w-0">
		<p class="truncate font-semibold text-foreground">{displayName}</p>
		<p class="truncate text-sm text-muted-foreground">@{username}</p>
	</div>
</a>
