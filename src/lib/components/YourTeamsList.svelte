<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

	type UserTeam = {
		id: string;
		name: string;
		slug: string;
		avatarUrl: string | null;
	};

	type Props = {
		teams: UserTeam[];
	};

	const { teams }: Props = $props();
</script>

<div class="rounded-lg border border-border bg-card">
	<div class="flex items-center justify-between border-b border-border px-4 py-3">
		<h2 class="text-sm font-semibold text-foreground">Your Teams</h2>
		{#if teams.length > 0}
			<a
				href="/teams"
				class="text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				View all &rarr;
			</a>
		{/if}
	</div>
	{#if teams.length > 0}
		<ul class="divide-y divide-border">
			{#each teams as team (team.id)}
				<li>
					<a
						href="/org/{team.slug}"
						class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
					>
						<Avatar class="size-7 flex-shrink-0">
							{#if team.avatarUrl}
								<AvatarImage src={team.avatarUrl} alt={team.name} />
							{/if}
							<AvatarFallback class="text-xs font-semibold">
								{team.name[0].toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span class="truncate text-sm font-medium text-foreground">{team.name}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="px-4 py-3">
			<a href="/teams" class={buttonVariants({ variant: 'outline', size: 'sm' }) + ' w-full'}>
				Create a team
			</a>
		</div>
	{/if}
</div>
