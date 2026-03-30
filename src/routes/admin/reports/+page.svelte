<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	const { data }: { data: PageData } = $props();

	let pendingReportId = $state<string | null>(null);

	function formatDate(date: Date | null | undefined): string {
		if (!date) return '—';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	const reasonLabels: Record<string, string> = {
		malicious: 'Malicious',
		spam: 'Spam',
		inappropriate: 'Inappropriate',
		other: 'Other'
	};
</script>

<svelte:head>
	<title>Reports - Admin - Coati</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-10">
	<div class="mb-6 lg:mb-8">
		<h1 class="text-foreground text-xl font-bold lg:text-2xl" data-testid="admin-heading">
			Setup Reports
		</h1>
		<p class="text-muted-foreground mt-1 text-sm">Review and action pending setup reports.</p>
	</div>

	<p class="text-muted-foreground mb-3 text-sm" data-testid="report-count">
		{data.reports.length} pending report{data.reports.length === 1 ? '' : 's'}
	</p>

	{#if data.reports.length === 0}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<p class="text-sm text-muted-foreground">No pending reports. All clear!</p>
		</div>
	{:else}
		<!-- Desktop table -->
		<div
			class="hidden overflow-hidden rounded-lg border border-border lg:block"
			data-testid="reports-table-desktop"
		>
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-muted/50">
					<tr>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Setup</th>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.reports as report (report.id)}
						<tr class="bg-card" data-testid="report-row">
							<td class="px-4 py-3">
								<a
									href="/{report.ownerUsername}/{report.setupSlug}"
									class="font-medium hover:underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									{report.setupName}
								</a>
								<div class="text-xs text-muted-foreground">by {report.ownerUsername}</div>
							</td>
							<td class="px-4 py-3">
								<a
									href="/{report.reporterUsername}"
									class="hover:underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									{report.reporterUsername}
								</a>
							</td>
							<td class="px-4 py-3">
								<span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
									{reasonLabels[report.reason] ?? report.reason}
								</span>
							</td>
							<td class="max-w-xs px-4 py-3 text-muted-foreground">
								{report.description ?? '—'}
							</td>
							<td class="px-4 py-3 text-muted-foreground">
								{formatDate(report.createdAt)}
							</td>
							<td class="px-4 py-3">
								<div class="flex gap-2">
									<form
										method="POST"
										action="?/dismiss"
										use:enhance={() => {
											pendingReportId = report.id;
											return async ({ result, update }) => {
												pendingReportId = null;
												if (result.type === 'success') {
													toast.success('Report dismissed');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="reportId" value={report.id} />
										<Button
											type="submit"
											variant="outline"
											size="sm"
											disabled={pendingReportId === report.id}
											data-testid="dismiss-btn"
										>
											Dismiss
										</Button>
									</form>
									<form
										method="POST"
										action="?/action"
										use:enhance={() => {
											pendingReportId = report.id;
											return async ({ result, update }) => {
												pendingReportId = null;
												if (result.type === 'success') {
													toast.success('Report actioned');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="reportId" value={report.id} />
										<Button
											type="submit"
											variant="destructive"
											size="sm"
											disabled={pendingReportId === report.id}
											data-testid="action-btn"
										>
											Action
										</Button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile cards -->
		<div class="space-y-4 lg:hidden" data-testid="reports-cards-mobile">
			{#each data.reports as report (report.id)}
				<div class="rounded-lg border border-border bg-card p-4" data-testid="report-card">
					<div class="mb-3 flex items-start justify-between gap-2">
						<div>
							<a
								href="/{report.ownerUsername}/{report.setupSlug}"
								class="font-medium hover:underline"
								target="_blank"
								rel="noopener noreferrer"
							>
								{report.setupName}
							</a>
							<div class="text-xs text-muted-foreground">by {report.ownerUsername}</div>
						</div>
						<span class="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-medium">
							{reasonLabels[report.reason] ?? report.reason}
						</span>
					</div>
					<div class="mb-3 text-sm text-muted-foreground">
						<span class="font-medium">Reporter:</span>
						<a
							href="/{report.reporterUsername}"
							class="hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						>
							{report.reporterUsername}
						</a>
					</div>
					{#if report.description}
						<p class="mb-3 text-sm text-muted-foreground">{report.description}</p>
					{/if}
					<div class="mb-3 text-xs text-muted-foreground">{formatDate(report.createdAt)}</div>
					<div class="flex gap-2">
						<form
							method="POST"
							action="?/dismiss"
							use:enhance={() => {
								pendingReportId = report.id;
								return async ({ result, update }) => {
									pendingReportId = null;
									if (result.type === 'success') {
										toast.success('Report dismissed');
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="reportId" value={report.id} />
							<Button
								type="submit"
								variant="outline"
								size="sm"
								disabled={pendingReportId === report.id}
							>
								Dismiss
							</Button>
						</form>
						<form
							method="POST"
							action="?/action"
							use:enhance={() => {
								pendingReportId = report.id;
								return async ({ result, update }) => {
									pendingReportId = null;
									if (result.type === 'success') {
										toast.success('Report actioned');
									}
									await update();
								};
							}}
						>
							<input type="hidden" name="reportId" value={report.id} />
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								disabled={pendingReportId === report.id}
							>
								Action
							</Button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
