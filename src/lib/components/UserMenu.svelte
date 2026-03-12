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

	let { user }: { user: LayoutUser } = $props();

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' });
		await invalidateAll();
		await goto('/');
	}
</script>

<DropdownMenu>
	<DropdownMenuTrigger>
		<Avatar class="h-8 w-8 cursor-pointer">
			<AvatarImage src={user.avatarUrl} alt={user.username} />
			<AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
		</Avatar>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" class="w-48">
		<a href="/{user.username}">
			<DropdownMenuItem>My Profile</DropdownMenuItem>
		</a>
		<a href="/new">
			<DropdownMenuItem>New Setup</DropdownMenuItem>
		</a>
		<a href="/settings">
			<DropdownMenuItem>Settings</DropdownMenuItem>
		</a>
		<DropdownMenuSeparator />
		<DropdownMenuItem onclick={signOut}>Sign Out</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
