<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	interface CommentWithAuthor {
		id: string;
		body: string;
		parentId: string | null;
		createdAt: Date;
		authorUsername: string;
		authorAvatarUrl: string;
	}

	interface Props {
		comments: CommentWithAuthor[];
		isLoggedIn: boolean;
		currentUsername: string | null;
	}

	const { comments, isLoggedIn, currentUsername }: Props = $props();

	const topLevel = $derived(comments.filter((c) => c.parentId === null));

	const repliesByParent = $derived(
		comments.reduce((map, c) => {
			if (c.parentId !== null) {
				const arr = map.get(c.parentId) ?? [];
				arr.push(c);
				map.set(c.parentId, arr);
			}
			return map;
		}, new Map<string, CommentWithAuthor[]>())
	);

	let activeReplyId = $state<string | null>(null);
	let commentBody = $state('');

	function toggleReply(commentId: string) {
		activeReplyId = activeReplyId === commentId ? null : commentId;
	}

	function confirmDelete(event: Event) {
		if (!confirm('Are you sure you want to delete this comment? This cannot be undone.')) {
			event.preventDefault();
		}
	}
</script>

<div class="space-y-6">
	<h2 class="text-lg font-semibold">
		Comments <span class="text-sm font-normal text-muted-foreground">({comments.length})</span>
	</h2>

	<!-- New comment form -->
	{#if isLoggedIn}
		<form
			method="POST"
			action="?/comment"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure' || result.type === 'error') {
						toast.error('Failed to post comment');
					} else {
						commentBody = '';
						await update({ reset: true });
					}
				};
			}}
		>
			<div class="space-y-2">
				<textarea
					name="body"
					rows="3"
					placeholder="Leave a comment…"
					required
					bind:value={commentBody}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				></textarea>
				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						Comment
					</button>
				</div>
			</div>
		</form>
	{:else}
		<p class="text-sm text-muted-foreground">
			<a href="/auth/login/github" class="underline hover:text-foreground">Sign in</a> to leave a comment.
		</p>
	{/if}

	<!-- Comment list -->
	{#if topLevel.length === 0}
		<p class="text-sm text-muted-foreground">No comments yet. Be the first!</p>
	{:else}
		<div class="space-y-4">
			{#each topLevel as comment (comment.id)}
				<div>
					<!-- Top-level comment -->
					<div class="flex gap-3">
						<Avatar class="mt-0.5 size-5 shrink-0 lg:size-7">
							<AvatarImage src={comment.authorAvatarUrl} alt={comment.authorUsername} />
							<AvatarFallback>{comment.authorUsername[0].toUpperCase()}</AvatarFallback>
						</Avatar>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-2">
								<a href="/{comment.authorUsername}" class="text-sm font-medium hover:underline">
									{comment.authorUsername}
								</a>
								<span class="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
							</div>
							<p class="mt-1 text-sm">{comment.body}</p>
							<div class="mt-1 flex items-center gap-3">
								{#if isLoggedIn}
									<button
										type="button"
										onclick={() => toggleReply(comment.id)}
										class="text-xs text-muted-foreground hover:text-foreground"
									>
										{activeReplyId === comment.id ? 'Cancel' : 'Reply'}
									</button>
								{/if}
								{#if currentUsername === comment.authorUsername}
									<form
										method="POST"
										action="?/deleteComment"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'failure' || result.type === 'error') {
													toast.error('Failed to delete comment');
												} else {
													await update({ reset: true });
												}
											};
										}}
									>
										<input type="hidden" name="commentId" value={comment.id} />
										<button
											type="submit"
											onclick={confirmDelete}
											class="text-xs text-muted-foreground hover:text-destructive"
										>
											Delete
										</button>
									</form>
								{/if}
							</div>
						</div>
					</div>

					<!-- Inline reply form -->
					{#if activeReplyId === comment.id}
						<div class="ml-7 mt-3 lg:ml-10">
							<form
								method="POST"
								action="?/comment"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'failure' || result.type === 'error') {
											toast.error('Failed to post comment');
										} else {
											activeReplyId = null;
											await update({ reset: true });
										}
									};
								}}
							>
								<input type="hidden" name="parentId" value={comment.id} />
								<div class="space-y-2">
									<textarea
										name="body"
										rows="2"
										placeholder="Write a reply…"
										required
										class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									></textarea>
									<div class="flex gap-2">
										<button
											type="submit"
											class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
										>
											Reply
										</button>
										<button
											type="button"
											onclick={() => (activeReplyId = null)}
											class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
										>
											Cancel
										</button>
									</div>
								</div>
							</form>
						</div>
					{/if}

					<!-- Replies -->
					{#if repliesByParent.get(comment.id)?.length}
						<div class="ml-7 mt-3 space-y-3 lg:ml-10">
							{#each repliesByParent.get(comment.id) ?? [] as reply (reply.id)}
								<div class="flex gap-3">
									<Avatar class="mt-0.5 size-5 shrink-0 lg:size-6">
										<AvatarImage src={reply.authorAvatarUrl} alt={reply.authorUsername} />
										<AvatarFallback>{reply.authorUsername[0].toUpperCase()}</AvatarFallback>
									</Avatar>
									<div class="min-w-0 flex-1">
										<div class="flex items-baseline gap-2">
											<a href="/{reply.authorUsername}" class="text-sm font-medium hover:underline">
												{reply.authorUsername}
											</a>
											<span class="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
										</div>
										<p class="mt-1 text-sm">{reply.body}</p>
										{#if currentUsername === reply.authorUsername}
											<form
												method="POST"
												action="?/deleteComment"
												use:enhance={() => {
													return async ({ result, update }) => {
														if (result.type === 'failure' || result.type === 'error') {
															toast.error('Failed to delete comment');
														} else {
															await update({ reset: true });
														}
													};
												}}
											>
												<input type="hidden" name="commentId" value={reply.id} />
												<button
													type="submit"
													onclick={confirmDelete}
													class="mt-1 text-xs text-muted-foreground hover:text-destructive"
												>
													Delete
												</button>
											</form>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
