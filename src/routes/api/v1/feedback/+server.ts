import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { feedbackSubmissions } from '$lib/server/db/schema';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { createFeedbackIssue, type FeedbackCategory } from '$lib/server/github-issues';

const GITHUB_REPO_OWNER = 'jimburch';
const GITHUB_REPO_NAME = 'coati';

const feedbackSchema = z.object({
	category: z.enum(['bug', 'improvement', 'feature-request']),
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().min(1, 'Description is required').max(2000),
	pageUrl: z.string().url('pageUrl must be a valid URL')
});

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	if (!user.isBetaApproved && !user.isAdmin) {
		return error('Beta access required', 'FORBIDDEN', 403);
	}

	const parsed = await parseRequestBody(event.request, feedbackSchema);
	if (parsed instanceof Response) return parsed;

	const token = env.GITHUB_FEEDBACK_TOKEN;
	if (!token) {
		return error('Feedback service not configured', 'SERVICE_UNAVAILABLE', 503);
	}

	let issueUrl: string;
	try {
		const issue = await createFeedbackIssue({
			token,
			owner: GITHUB_REPO_OWNER,
			repo: GITHUB_REPO_NAME,
			category: parsed.category as FeedbackCategory,
			title: parsed.title,
			description: parsed.description,
			pageUrl: parsed.pageUrl,
			username: user.username
		});
		issueUrl = issue.html_url;
	} catch {
		return error('Failed to create feedback issue', 'GITHUB_ERROR', 502);
	}

	await db.insert(feedbackSubmissions).values({
		userId: user.id,
		category: parsed.category as FeedbackCategory,
		title: parsed.title,
		description: parsed.description,
		pageUrl: parsed.pageUrl,
		githubIssueUrl: issueUrl
	});

	return success({ issueUrl }, 201);
};
