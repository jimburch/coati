<script lang="ts">
	import type { SetupActivityEntry } from '$lib/server/queries/activities';

	type Props = {
		activity: SetupActivityEntry[];
		username: string;
	};

	const { activity, username }: Props = $props();
</script>

{#if activity.length > 0}
	<section>
		<div class="mb-3">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Your Activity
			</h2>
		</div>
		<div class="flex flex-col gap-1.5">
			{#each activity as entry (`${entry.setupId}:${entry.actionType}`)}
				<div class="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
					{#if entry.actionType === 'starred_setup'}
						<span class="text-yellow-500">★</span>
						+{entry.count} new &middot;
						<a href="/{username}/{entry.setupSlug}" class="font-medium hover:underline"
							>{entry.setupName}</a
						>
						{#if entry.actorUsernames.length > 0}
							&middot; {entry.actorUsernames.join(
								', '
							)}{#if entry.count > entry.actorUsernames.length}, +{entry.count -
									entry.actorUsernames.length} more{/if}
						{/if}
					{:else if entry.actionType === 'cloned_setup'}
						<span>⬇</span>
						{entry.count} new clones of
						<a href="/{username}/{entry.setupSlug}" class="font-medium hover:underline"
							>{entry.setupName}</a
						>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
