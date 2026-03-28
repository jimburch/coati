const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

function githubHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': GITHUB_API_VERSION,
		'Content-Type': 'application/json'
	};
}

/**
 * Ensures a label exists on the repo, creating it if it doesn't.
 * Uses a deterministic color based on label name.
 */
async function ensureLabel(
	token: string,
	owner: string,
	repo: string,
	name: string,
	color: string = 'ededed'
): Promise<void> {
	const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/labels`, {
		method: 'POST',
		headers: githubHeaders(token),
		body: JSON.stringify({ name, color })
	});
	// 422 = label already exists — that's fine
	if (!res.ok && res.status !== 422) {
		throw new Error(`Failed to create label "${name}": HTTP ${res.status}`);
	}
}

export interface CreateIssueParams {
	token: string;
	owner: string;
	repo: string;
	title: string;
	body: string;
	labels: string[];
}

export interface GitHubIssue {
	number: number;
	html_url: string;
}

/**
 * Creates a GitHub issue, ensuring all labels exist first.
 */
export async function createIssue(params: CreateIssueParams): Promise<GitHubIssue> {
	const { token, owner, repo, title, body, labels } = params;

	for (const label of labels) {
		await ensureLabel(token, owner, repo, label);
	}

	const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
		method: 'POST',
		headers: githubHeaders(token),
		body: JSON.stringify({ title, body, labels })
	});

	if (!res.ok) {
		throw new Error(`Failed to create GitHub issue: HTTP ${res.status}`);
	}

	return res.json() as Promise<GitHubIssue>;
}

export type FeedbackCategory = 'bug' | 'improvement' | 'feature-request';

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
	bug: 'bug',
	improvement: 'improvement',
	'feature-request': 'feature-request'
};

export interface CreateFeedbackIssueParams {
	token: string;
	owner: string;
	repo: string;
	category: FeedbackCategory;
	title: string;
	description: string;
	pageUrl: string;
	username: string;
}

/**
 * Creates a structured feedback issue with standard labels and body format.
 */
export async function createFeedbackIssue(params: CreateFeedbackIssueParams): Promise<GitHubIssue> {
	const { token, owner, repo, category, title, description, pageUrl, username } = params;

	const labels = ['beta-feedback', CATEGORY_LABEL[category]];
	const body = [
		`## ${title}`,
		'',
		description,
		'',
		'---',
		'',
		`**Page:** ${pageUrl}`,
		`**Reported by:** @${username}`,
		`**Category:** ${category}`
	].join('\n');

	return createIssue({ token, owner, repo, title, body, labels });
}
