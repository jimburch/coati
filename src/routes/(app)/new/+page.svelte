<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { PageData } from './$types';
	const { data }: { data: PageData } = $props();

	const HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'] as const;
	type HookEvent = (typeof HOOK_EVENTS)[number];

	// Metadata
	let name = $state('');
	let slug = $state('');
	let description = $state('');
	let version = $state('0.1.0');
	let slugManuallyEdited = $state(false);
	let category = $state('');
	let license = $state('');
	let minToolVersion = $state('');
	let readmeContent = $state('');
	let selectedAgentIds = $state<string[]>([]);
	let selectedTagIds = $state<string[]>([]);

	// Components
	let instructions = $state<{ path: string; description: string; content: string }[]>([
		{ path: 'CLAUDE.md', description: '', content: '' }
	]);
	let commands = $state<{ name: string; description: string; content: string }[]>([]);
	let skills = $state<{ name: string; description: string; content: string }[]>([]);
	let mcpServers = $state<{ name: string; description: string; config: string }[]>([]);
	let hooks = $state<{ event: HookEvent; description: string; config: string }[]>([]);

	// Additional metadata
	let postInstall = $state<string[]>([]);
	let postInstallInput = $state('');
	let prerequisites = $state<string[]>([]);
	let prereqInput = $state('');

	let submitting = $state(false);
	let errorMsg = $state('');

	// JSON validation tracking
	let mcpJsonErrors = $state<Record<number, string>>({});
	let hookJsonErrors = $state<Record<number, string>>({});

	$effect(() => {
		if (!slugManuallyEdited) {
			slug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');
		}
	});

	function toggleAgent(id: string) {
		if (selectedAgentIds.includes(id)) {
			selectedAgentIds = selectedAgentIds.filter((t) => t !== id);
		} else {
			selectedAgentIds = [...selectedAgentIds, id];
		}
	}

	function toggleTag(id: string) {
		if (selectedTagIds.includes(id)) {
			selectedTagIds = selectedTagIds.filter((t) => t !== id);
		} else {
			selectedTagIds = [...selectedTagIds, id];
		}
	}

	function addPostInstall() {
		const value = postInstallInput.trim();
		if (value) {
			postInstall = [...postInstall, value];
			postInstallInput = '';
		}
	}

	function removePostInstall(index: number) {
		postInstall = postInstall.filter((_, i) => i !== index);
	}

	function addPrerequisite() {
		const value = prereqInput.trim();
		if (value && !prerequisites.includes(value)) {
			prerequisites = [...prerequisites, value];
			prereqInput = '';
		}
	}

	function removePrerequisite(index: number) {
		prerequisites = prerequisites.filter((_, i) => i !== index);
	}

	function validateJson(value: string): string | null {
		if (!value.trim()) return null;
		try {
			JSON.parse(value);
			return null;
		} catch (e) {
			return (e as Error).message;
		}
	}

	function validateMcpJson(index: number) {
		const err = validateJson(mcpServers[index].config);
		const next = { ...mcpJsonErrors };
		if (err) {
			next[index] = err;
		} else {
			delete next[index];
		}
		mcpJsonErrors = next;
	}

	function validateHookJson(index: number) {
		const err = validateJson(hooks[index].config);
		const next = { ...hookJsonErrors };
		if (err) {
			next[index] = err;
		} else {
			delete next[index];
		}
		hookJsonErrors = next;
	}

	async function handleSubmit() {
		errorMsg = '';

		// Validate at least one instruction has content
		const hasInstruction = instructions.some((i) => i.content.trim());
		if (!hasInstruction) {
			errorMsg = 'At least one instruction must have content.';
			return;
		}

		// Validate JSON fields
		const hasJsonErrors =
			Object.keys(mcpJsonErrors).length > 0 || Object.keys(hookJsonErrors).length > 0;
		if (hasJsonErrors) {
			errorMsg = 'Fix JSON validation errors before publishing.';
			return;
		}

		submitting = true;

		try {
			// Build flat files array from typed components
			const bodyFiles: {
				source: string;
				target: string;
				placement: string;
				componentType: string;
				description?: string;
				content: string;
			}[] = [];

			// Instructions
			for (const inst of instructions) {
				if (!inst.content.trim()) continue;
				bodyFiles.push({
					source: inst.path,
					target: inst.path,
					placement: inst.path === 'CLAUDE.md' ? 'project' : 'relative',
					componentType: 'instruction',
					description: inst.description || undefined,
					content: inst.content
				});
			}

			// Commands
			for (const cmd of commands) {
				if (!cmd.name.trim() || !cmd.content.trim()) continue;
				const path = `.claude/commands/${cmd.name}.md`;
				bodyFiles.push({
					source: path,
					target: path,
					placement: 'project',
					componentType: 'command',
					description: cmd.description || undefined,
					content: cmd.content
				});
			}

			// Skills
			for (const skill of skills) {
				if (!skill.name.trim() || !skill.content.trim()) continue;
				const path = `.claude/skills/${skill.name}.md`;
				bodyFiles.push({
					source: path,
					target: path,
					placement: 'project',
					componentType: 'skill',
					description: skill.description || undefined,
					content: skill.content
				});
			}

			// MCP Servers
			for (const server of mcpServers) {
				if (!server.name.trim() || !server.config.trim()) continue;
				bodyFiles.push({
					source: server.name,
					target: server.name,
					placement: 'project',
					componentType: 'mcp_server',
					description: server.description || undefined,
					content: server.config
				});
			}

			// Hooks
			for (const hook of hooks) {
				if (!hook.config.trim()) continue;
				bodyFiles.push({
					source: hook.event,
					target: hook.event,
					placement: 'project',
					componentType: 'hook',
					description: hook.description || undefined,
					content: hook.config
				});
			}

			// README
			let readmePath: string | undefined;
			if (readmeContent.trim()) {
				readmePath = 'README.md';
				bodyFiles.push({
					source: 'README.md',
					target: 'README.md',
					placement: 'project',
					componentType: 'instruction',
					description: 'Setup README',
					content: readmeContent
				});
			}

			const body: Record<string, unknown> = {
				name,
				slug,
				description,
				version,
				readmePath,
				category: category || undefined,
				license: license || undefined,
				minToolVersion: minToolVersion || undefined,
				postInstall: postInstall.length > 0 ? postInstall : undefined,
				prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
				files: bodyFiles.length > 0 ? bodyFiles : undefined,
				agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
				tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined
			};

			const res = await fetch('/api/v1/setups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const json = await res.json();
				errorMsg = json.error || 'Something went wrong';
				return;
			}

			await goto(`/${data.user.username}/${slug}`);
		} catch {
			errorMsg = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}

	const textareaClass =
		'border-input bg-background w-full rounded-md border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
	const selectClass =
		'border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="mb-8 text-2xl font-bold">Create a new setup</h1>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-8"
	>
		<!-- Metadata -->
		<div class="space-y-4">
			<div>
				<label for="name" class="mb-1.5 block text-sm font-medium">Name</label>
				<Input id="name" bind:value={name} placeholder="My awesome setup" required />
			</div>

			<div>
				<label for="slug" class="mb-1.5 block text-sm font-medium">Slug</label>
				<div class="flex items-center gap-1.5">
					<span class="text-muted-foreground text-sm">{data.user.username}/</span>
					<Input
						id="slug"
						bind:value={slug}
						oninput={() => (slugManuallyEdited = true)}
						placeholder="my-awesome-setup"
						required
					/>
				</div>
			</div>

			<div>
				<label for="description" class="mb-1.5 block text-sm font-medium">Description</label>
				<textarea
					id="description"
					bind:value={description}
					maxlength={300}
					rows={3}
					placeholder="Briefly describe what this setup does"
					class={textareaClass}
					required
				></textarea>
				<p class="text-muted-foreground mt-1 text-xs">{description.length}/300</p>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div>
					<label for="version" class="mb-1.5 block text-sm font-medium">Version</label>
					<Input id="version" bind:value={version} placeholder="0.1.0" required />
				</div>
				<div>
					<label for="category" class="mb-1.5 block text-sm font-medium">Category</label>
					<select id="category" bind:value={category} class={selectClass}>
						<option value="">None</option>
						<option value="web-dev">Web Dev</option>
						<option value="mobile">Mobile</option>
						<option value="data-science">Data Science</option>
						<option value="devops">DevOps</option>
						<option value="systems">Systems</option>
						<option value="general">General</option>
					</select>
				</div>
				<div>
					<label for="license" class="mb-1.5 block text-sm font-medium">License</label>
					<Input id="license" bind:value={license} placeholder="MIT" />
				</div>
			</div>

			<div>
				<label for="min-tool-version" class="mb-1.5 block text-sm font-medium"
					>Min tool version</label
				>
				<Input id="min-tool-version" bind:value={minToolVersion} placeholder="1.0.0" />
			</div>
		</div>

		<!-- Tags -->
		<div>
			<h2 class="mb-3 text-lg font-semibold">Tags</h2>
			{#if data.tags.length === 0}
				<p class="text-muted-foreground text-sm">No tags available yet.</p>
			{:else}
				<div class="flex flex-wrap gap-3">
					{#each data.tags as tag (tag.id)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={selectedTagIds.includes(tag.id)}
								onchange={() => toggleTag(tag.id)}
								class="rounded"
							/>
							{tag.name}
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Agents -->
		<div>
			<h2 class="mb-3 text-lg font-semibold">Agents</h2>
			{#if data.agents.length === 0}
				<p class="text-muted-foreground text-sm">No agents available yet.</p>
			{:else}
				<div class="flex flex-wrap gap-3">
					{#each data.agents as agent (agent.id)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={selectedAgentIds.includes(agent.id)}
								onchange={() => toggleAgent(agent.id)}
								class="rounded"
							/>
							{agent.displayName}
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Components -->
		<div class="space-y-6">
			<h2 class="text-lg font-semibold">Components</h2>

			<!-- Instructions -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Instructions</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							instructions = [...instructions, { path: '', description: '', content: '' }];
						}}>Add Instruction</Button
					>
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					CLAUDE.md files that shape Claude's behavior. At least one is required.
				</p>
				<div class="space-y-4">
					{#each instructions as inst, i (i)}
						<div class="space-y-3 rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Instruction {i + 1}</span>
								{#if instructions.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="text-destructive"
										onclick={() => {
											instructions = instructions.filter((_, idx) => idx !== i);
										}}>Remove</Button
									>
								{/if}
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="inst-path-{i}" class="mb-1 block text-xs font-medium">File path</label
									>
									<Input id="inst-path-{i}" bind:value={inst.path} placeholder="CLAUDE.md" />
								</div>
								<div>
									<label for="inst-desc-{i}" class="mb-1 block text-xs font-medium"
										>Description (optional)</label
									>
									<Input
										id="inst-desc-{i}"
										bind:value={inst.description}
										placeholder="What this instruction covers"
									/>
								</div>
							</div>
							<div>
								<label for="inst-content-{i}" class="mb-1 block text-xs font-medium">Content</label>
								<textarea
									id="inst-content-{i}"
									bind:value={inst.content}
									rows={8}
									placeholder="# CLAUDE.md&#10;&#10;## Coding Conventions&#10;..."
									class={textareaClass}
								></textarea>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Slash Commands -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Slash Commands</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							commands = [...commands, { name: '', description: '', content: '' }];
						}}>Add Command</Button
					>
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					Reusable prompt templates invoked via /command-name. Stored in .claude/commands/.
				</p>
				{#if commands.length === 0}
					<p class="text-muted-foreground text-sm">No commands added.</p>
				{/if}
				<div class="space-y-4">
					{#each commands as cmd, i (i)}
						<div class="space-y-3 rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">/{cmd.name || '...'}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => {
										commands = commands.filter((_, idx) => idx !== i);
									}}>Remove</Button
								>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="cmd-name-{i}" class="mb-1 block text-xs font-medium"
										>Command name</label
									>
									<Input id="cmd-name-{i}" bind:value={cmd.name} placeholder="review-pr" />
									{#if cmd.name}
										<p class="text-muted-foreground mt-1 text-xs">
											.claude/commands/{cmd.name}.md
										</p>
									{/if}
								</div>
								<div>
									<label for="cmd-desc-{i}" class="mb-1 block text-xs font-medium"
										>Description (optional)</label
									>
									<Input
										id="cmd-desc-{i}"
										bind:value={cmd.description}
										placeholder="What this command does"
									/>
								</div>
							</div>
							<div>
								<label for="cmd-content-{i}" class="mb-1 block text-xs font-medium">Content</label>
								<textarea
									id="cmd-content-{i}"
									bind:value={cmd.content}
									rows={6}
									placeholder="Review pull request #$ARGUMENTS..."
									class={textareaClass}
								></textarea>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Skills -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Skills</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							skills = [...skills, { name: '', description: '', content: '' }];
						}}>Add Skill</Button
					>
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					Rich prompt templates with YAML frontmatter for auto-triggering. Stored in
					.claude/skills/.
				</p>
				{#if skills.length === 0}
					<p class="text-muted-foreground text-sm">No skills added.</p>
				{/if}
				<div class="space-y-4">
					{#each skills as skill, i (i)}
						<div class="space-y-3 rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">{skill.name || 'Unnamed skill'}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => {
										skills = skills.filter((_, idx) => idx !== i);
									}}>Remove</Button
								>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="skill-name-{i}" class="mb-1 block text-xs font-medium"
										>Skill name</label
									>
									<Input id="skill-name-{i}" bind:value={skill.name} placeholder="tdd" />
									{#if skill.name}
										<p class="text-muted-foreground mt-1 text-xs">
											.claude/skills/{skill.name}.md
										</p>
									{/if}
								</div>
								<div>
									<label for="skill-desc-{i}" class="mb-1 block text-xs font-medium"
										>Description (optional)</label
									>
									<Input
										id="skill-desc-{i}"
										bind:value={skill.description}
										placeholder="What this skill does"
									/>
								</div>
							</div>
							<div>
								<label for="skill-content-{i}" class="mb-1 block text-xs font-medium">Content</label
								>
								<textarea
									id="skill-content-{i}"
									bind:value={skill.content}
									rows={8}
									placeholder="---&#10;name: my-skill&#10;description: Use when...&#10;---&#10;&#10;## Workflow&#10;..."
									class={textareaClass}
								></textarea>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- MCP Servers -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold">MCP Servers</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							mcpServers = [...mcpServers, { name: '', description: '', config: '' }];
						}}>Add MCP Server</Button
					>
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					External tool integrations. Merged into .claude/settings.json on clone.
				</p>
				{#if mcpServers.length === 0}
					<p class="text-muted-foreground text-sm">No MCP servers added.</p>
				{/if}
				<div class="space-y-4">
					{#each mcpServers as server, i (i)}
						<div class="space-y-3 rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">{server.name || 'Unnamed server'}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => {
										mcpServers = mcpServers.filter((_s, idx) => idx !== i);
										const next = { ...mcpJsonErrors };
										delete next[i];
										mcpJsonErrors = next;
									}}>Remove</Button
								>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="mcp-name-{i}" class="mb-1 block text-xs font-medium"
										>Server name</label
									>
									<Input id="mcp-name-{i}" bind:value={server.name} placeholder="serena" />
								</div>
								<div>
									<label for="mcp-desc-{i}" class="mb-1 block text-xs font-medium"
										>Description (optional)</label
									>
									<Input
										id="mcp-desc-{i}"
										bind:value={server.description}
										placeholder="What this server does"
									/>
								</div>
							</div>
							<div>
								<label for="mcp-config-{i}" class="mb-1 block text-xs font-medium"
									>Config (JSON)</label
								>
								<textarea
									id="mcp-config-{i}"
									bind:value={server.config}
									rows={5}
									oninput={() => validateMcpJson(i)}
									placeholder={'{\n  "command": "uvx",\n  "args": ["serena"],\n  "env": {}\n}'}
									class="{textareaClass} {mcpJsonErrors[i] ? 'border-destructive' : ''}"
								></textarea>
								{#if mcpJsonErrors[i]}
									<p class="mt-1 text-xs text-destructive">Invalid JSON: {mcpJsonErrors[i]}</p>
								{:else if server.config.trim()}
									<p class="text-muted-foreground mt-1 text-xs">Valid JSON</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Hooks -->
			<div>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-semibold">Hooks</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							hooks = [...hooks, { event: 'PreToolUse', description: '', config: '' }];
						}}>Add Hook</Button
					>
				</div>
				<p class="text-muted-foreground mb-3 text-xs">
					Event-driven shell commands for Claude Code lifecycle events. Merged into
					.claude/settings.json on clone.
				</p>
				{#if hooks.length === 0}
					<p class="text-muted-foreground text-sm">No hooks added.</p>
				{/if}
				<div class="space-y-4">
					{#each hooks as hook, i (i)}
						<div class="space-y-3 rounded-lg border p-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">{hook.event}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => {
										hooks = hooks.filter((_h, idx) => idx !== i);
										const next = { ...hookJsonErrors };
										delete next[i];
										hookJsonErrors = next;
									}}>Remove</Button
								>
							</div>
							<div class="grid grid-cols-2 gap-3">
								<div>
									<label for="hook-event-{i}" class="mb-1 block text-xs font-medium">Event</label>
									<select id="hook-event-{i}" bind:value={hook.event} class={selectClass}>
										{#each HOOK_EVENTS as event (event)}
											<option value={event}>{event}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="hook-desc-{i}" class="mb-1 block text-xs font-medium"
										>Description (optional)</label
									>
									<Input
										id="hook-desc-{i}"
										bind:value={hook.description}
										placeholder="What this hook does"
									/>
								</div>
							</div>
							<div>
								<label for="hook-config-{i}" class="mb-1 block text-xs font-medium"
									>Config (JSON)</label
								>
								<textarea
									id="hook-config-{i}"
									bind:value={hook.config}
									rows={5}
									oninput={() => validateHookJson(i)}
									placeholder={'{\n  "matcher": "Write|Edit",\n  "hooks": [{ "type": "command", "command": "echo hello" }]\n}'}
									class="{textareaClass} {hookJsonErrors[i] ? 'border-destructive' : ''}"
								></textarea>
								{#if hookJsonErrors[i]}
									<p class="mt-1 text-xs text-destructive">Invalid JSON: {hookJsonErrors[i]}</p>
								{:else if hook.config.trim()}
									<p class="text-muted-foreground mt-1 text-xs">Valid JSON</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Prerequisites -->
		<div>
			<h2 class="mb-3 text-lg font-semibold">Prerequisites</h2>
			<p class="text-muted-foreground mb-3 text-xs">
				What users need before cloning this setup (e.g. "Node.js 20+", "PostgreSQL 15+").
			</p>
			<div class="flex gap-2">
				<Input
					bind:value={prereqInput}
					placeholder="Type a prerequisite and press Enter"
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addPrerequisite();
						}
					}}
				/>
				<Button type="button" variant="outline" size="sm" onclick={addPrerequisite}>Add</Button>
			</div>
			{#if prerequisites.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each prerequisites as prereq, i (i)}
						<span class="bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
							{prereq}
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground ml-1"
								onclick={() => removePrerequisite(i)}
							>
								&times;
							</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Post-install commands -->
		<div>
			<h2 class="mb-3 text-lg font-semibold">Post-install commands</h2>
			<p class="text-muted-foreground mb-3 text-xs">
				Commands displayed after a successful clone. Add each step separately.
			</p>
			<div class="flex gap-2">
				<Input
					bind:value={postInstallInput}
					placeholder="Type a command and press Enter"
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addPostInstall();
						}
					}}
				/>
				<Button type="button" variant="outline" size="sm" onclick={addPostInstall}>Add</Button>
			</div>
			{#if postInstall.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each postInstall as cmd, i (i)}
						<span class="bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
							{cmd}
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground ml-1"
								onclick={() => removePostInstall(i)}
							>
								&times;
							</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- README -->
		<div>
			<h2 class="mb-3 text-lg font-semibold">README</h2>
			<textarea
				bind:value={readmeContent}
				rows={8}
				placeholder="Write your README in Markdown..."
				class={textareaClass}
			></textarea>
			<p class="text-muted-foreground mt-1 text-xs">
				Markdown will be rendered on the published page.
			</p>
		</div>

		<!-- Submit -->
		<div class="border-t pt-6">
			{#if errorMsg}
				<p class="mb-4 text-sm text-destructive">{errorMsg}</p>
			{/if}
			<Button type="submit" disabled={submitting}>
				{submitting ? 'Publishing...' : 'Publish Setup'}
			</Button>
		</div>
	</form>
</div>
