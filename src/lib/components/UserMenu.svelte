<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import type { LayoutUser } from '$lib/types';

	let { user, pendingInviteCount = 0 }: { user: LayoutUser; pendingInviteCount?: number } =
		$props();

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' });
		await invalidateAll();
		await goto('/');
	}
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		<div class="relative">
			<Avatar class="h-8 w-8 cursor-pointer">
				<AvatarImage src={user.avatarUrl} alt={user.username} />
				<AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
			</Avatar>
			{#if pendingInviteCount > 0}
				<span
					class="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
				>
					{pendingInviteCount}
				</span>
			{/if}
		</div>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" class="w-48">
		<a href="/{user.username}">
			<DropdownMenuItem>My Profile</DropdownMenuItem>
		</a>
		<a href="/settings">
			<DropdownMenuItem>Settings</DropdownMenuItem>
		</a>
		<a href="/teams">
			<DropdownMenuItem>My Teams</DropdownMenuItem>
		</a>
		<a href="/invites">
			<DropdownMenuItem>
				<span class="flex w-full items-center justify-between">
					Pending Invites
					{#if pendingInviteCount > 0}
						<span
							class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground"
						>
							{pendingInviteCount}
						</span>
					{/if}
				</span>
			</DropdownMenuItem>
		</a>
		{#if user.isAdmin}
			<a href="/admin/beta">
				<DropdownMenuItem>Admin</DropdownMenuItem>
			</a>
		{/if}
		<DropdownMenuSeparator />
		<DropdownMenuItem onclick={signOut}>Sign Out</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
