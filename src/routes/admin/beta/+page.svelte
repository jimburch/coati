<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	const { data }: { data: PageData } = $props();

	let pendingUserId = $state<string | null>(null);

	function formatDate(date: Date | null | undefined): string {
		if (!date) return '—';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-10">
	<div class="mb-6 lg:mb-8">
		<h1 class="text-foreground text-xl font-bold lg:text-2xl" data-testid="admin-heading">
			Beta Management
		</h1>
		<p class="text-muted-foreground mt-1 text-sm">Manage beta access for all users.</p>
	</div>

	<!-- Search -->
	<form method="GET" class="mb-4 flex gap-2 lg:mb-6" data-testid="search-form">
		<Input
			type="search"
			name="q"
			placeholder="Search by username..."
			value={data.search}
			class="max-w-xs"
			data-testid="search-input"
		/>
		<Button type="submit" variant="outline" data-testid="search-button">Search</Button>
	</form>

	<!-- User count -->
	<p class="text-muted-foreground mb-3 text-sm" data-testid="user-count">
		{data.users.length} user{data.users.length === 1 ? '' : 's'}
		{data.search ? `matching "${data.search}"` : 'total'}
	</p>

	<!-- Table (desktop) / Cards (mobile) -->
	<div class="hidden lg:block" data-testid="users-table-desktop">
		<div class="border-border overflow-hidden rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">User</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Email</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Signed up</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Last login</th>
						<th class="text-muted-foreground px-4 py-3 text-center font-medium">Feedback</th>
						<th class="text-muted-foreground px-4 py-3 text-center font-medium">Beta approved</th>
						<th class="text-muted-foreground px-4 py-3 text-center font-medium">Beta features</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.users as user (user.id)}
						<tr class="hover:bg-muted/30 transition-colors" data-testid="user-row">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<img
										src={user.avatarUrl}
										alt="{user.username}'s avatar"
										class="h-8 w-8 rounded-full"
										data-testid="user-avatar"
									/>
									<div>
										<p class="text-foreground font-medium" data-testid="user-username">
											{user.username}
										</p>
										<a
											href="https://github.com/{user.githubUsername}"
											target="_blank"
											rel="noopener noreferrer"
											class="text-muted-foreground hover:text-primary text-xs hover:underline"
											data-testid="github-link"
										>
											@{user.githubUsername}
										</a>
									</div>
								</div>
							</td>
							<td class="text-muted-foreground px-4 py-3" data-testid="user-email">
								{user.email}
							</td>
							<td class="text-muted-foreground px-4 py-3" data-testid="user-signup-date">
								{formatDate(user.createdAt)}
							</td>
							<td class="text-muted-foreground px-4 py-3" data-testid="user-last-login">
								{formatDate(user.lastLoginAt)}
							</td>
							<td class="px-4 py-3 text-center" data-testid="user-feedback-count">
								{user.feedbackCount}
							</td>
							<td class="px-4 py-3 text-center">
								<form
									method="POST"
									action="?/toggleBeta"
									use:enhance={() => {
										pendingUserId = user.id;
										const username = user.username;
										const granting = !user.isBetaApproved;
										return async ({ result, update }) => {
											pendingUserId = null;
											if (result.type === 'failure' || result.type === 'error') {
												toast.error('Failed to update beta access');
											} else {
												toast.success(
													granting
														? `Beta access granted for ${username}`
														: `Beta access revoked for ${username}`
												);
												await update();
											}
										};
									}}
									data-testid="toggle-form"
								>
									<input type="hidden" name="userId" value={user.id} />
									<input
										type="hidden"
										name="approved"
										value={user.isBetaApproved ? 'false' : 'true'}
									/>
									<button
										type="submit"
										disabled={pendingUserId === user.id}
										class="inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {user.isBetaApproved
											? 'bg-primary'
											: 'bg-muted'}"
										aria-label="{user.isBetaApproved
											? 'Revoke'
											: 'Approve'} beta access for {user.username}"
										data-testid="beta-toggle"
										data-approved={user.isBetaApproved}
									>
										<span
											class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform {user.isBetaApproved
												? 'translate-x-5'
												: 'translate-x-0.5'}"
										></span>
									</button>
								</form>
							</td>
							<td class="px-4 py-3 text-center">
								<form
									method="POST"
									action="?/toggleBetaFeatures"
									use:enhance={() => {
										pendingUserId = user.id;
										const username = user.username;
										const granting = !user.hasBetaFeatures;
										return async ({ result, update }) => {
											pendingUserId = null;
											if (result.type === 'failure' || result.type === 'error') {
												toast.error('Failed to update beta features access');
											} else {
												toast.success(
													granting
														? `Beta features enabled for ${username}`
														: `Beta features disabled for ${username}`
												);
												await update();
											}
										};
									}}
									data-testid="toggle-beta-features-form"
								>
									<input type="hidden" name="userId" value={user.id} />
									<input
										type="hidden"
										name="enabled"
										value={user.hasBetaFeatures ? 'false' : 'true'}
									/>
									<button
										type="submit"
										disabled={pendingUserId === user.id}
										class="inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {user.hasBetaFeatures
											? 'bg-primary'
											: 'bg-muted'}"
										aria-label="{user.hasBetaFeatures
											? 'Disable'
											: 'Enable'} beta features for {user.username}"
										data-testid="beta-features-toggle"
										data-enabled={user.hasBetaFeatures}
									>
										<span
											class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform {user.hasBetaFeatures
												? 'translate-x-5'
												: 'translate-x-0.5'}"
										></span>
									</button>
								</form>
							</td>
						</tr>
					{/each}

					{#if data.users.length === 0}
						<tr>
							<td
								colspan="7"
								class="text-muted-foreground px-4 py-8 text-center"
								data-testid="empty-state"
							>
								No users found{data.search ? ` matching "${data.search}"` : ''}.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Mobile card list -->
	<div class="space-y-3 lg:hidden" data-testid="users-list-mobile">
		{#each data.users as user (user.id)}
			<div class="border-border rounded-lg border p-4" data-testid="user-card">
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<img
							src={user.avatarUrl}
							alt="{user.username}'s avatar"
							class="h-10 w-10 rounded-full"
							data-testid="user-avatar"
						/>
						<div>
							<p class="text-foreground font-medium" data-testid="user-username">
								{user.username}
							</p>
							<a
								href="https://github.com/{user.githubUsername}"
								target="_blank"
								rel="noopener noreferrer"
								class="text-muted-foreground hover:text-primary text-xs hover:underline"
								data-testid="github-link"
							>
								@{user.githubUsername}
							</a>
						</div>
					</div>

					<form
						method="POST"
						action="?/toggleBeta"
						use:enhance={() => {
							pendingUserId = user.id;
							const username = user.username;
							const granting = !user.isBetaApproved;
							return async ({ result, update }) => {
								pendingUserId = null;
								if (result.type === 'failure' || result.type === 'error') {
									toast.error('Failed to update beta access');
								} else {
									toast.success(
										granting
											? `Beta access granted for ${username}`
											: `Beta access revoked for ${username}`
									);
									await update();
								}
							};
						}}
						data-testid="toggle-form"
					>
						<input type="hidden" name="userId" value={user.id} />
						<input type="hidden" name="approved" value={user.isBetaApproved ? 'false' : 'true'} />
						<button
							type="submit"
							disabled={pendingUserId === user.id}
							class="inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {user.isBetaApproved
								? 'bg-primary'
								: 'bg-muted'}"
							aria-label="{user.isBetaApproved
								? 'Revoke'
								: 'Approve'} beta access for {user.username}"
							data-testid="beta-toggle"
							data-approved={user.isBetaApproved}
						>
							<span
								class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform {user.isBetaApproved
									? 'translate-x-5'
									: 'translate-x-0.5'}"
							></span>
						</button>
					</form>
				</div>

				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-muted-foreground">Email</dt>
					<dd class="text-foreground truncate" data-testid="user-email">{user.email}</dd>

					<dt class="text-muted-foreground">Signed up</dt>
					<dd class="text-foreground" data-testid="user-signup-date">
						{formatDate(user.createdAt)}
					</dd>

					<dt class="text-muted-foreground">Last login</dt>
					<dd class="text-foreground" data-testid="user-last-login">
						{formatDate(user.lastLoginAt)}
					</dd>

					<dt class="text-muted-foreground">Feedback</dt>
					<dd class="text-foreground" data-testid="user-feedback-count">{user.feedbackCount}</dd>

					<dt class="text-muted-foreground">Beta features</dt>
					<dd>
						<form
							method="POST"
							action="?/toggleBetaFeatures"
							use:enhance={() => {
								pendingUserId = user.id;
								const username = user.username;
								const granting = !user.hasBetaFeatures;
								return async ({ result, update }) => {
									pendingUserId = null;
									if (result.type === 'failure' || result.type === 'error') {
										toast.error('Failed to update beta features access');
									} else {
										toast.success(
											granting
												? `Beta features enabled for ${username}`
												: `Beta features disabled for ${username}`
										);
										await update();
									}
								};
							}}
							data-testid="toggle-beta-features-form"
						>
							<input type="hidden" name="userId" value={user.id} />
							<input type="hidden" name="enabled" value={user.hasBetaFeatures ? 'false' : 'true'} />
							<button
								type="submit"
								disabled={pendingUserId === user.id}
								class="inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {user.hasBetaFeatures
									? 'bg-primary'
									: 'bg-muted'}"
								aria-label="{user.hasBetaFeatures
									? 'Disable'
									: 'Enable'} beta features for {user.username}"
								data-testid="beta-features-toggle"
								data-enabled={user.hasBetaFeatures}
							>
								<span
									class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform {user.hasBetaFeatures
										? 'translate-x-5'
										: 'translate-x-0.5'}"
								></span>
							</button>
						</form>
					</dd>
				</dl>
			</div>
		{/each}

		{#if data.users.length === 0}
			<p class="text-muted-foreground py-8 text-center" data-testid="empty-state">
				No users found{data.search ? ` matching "${data.search}"` : ''}.
			</p>
		{/if}
	</div>
</div>
