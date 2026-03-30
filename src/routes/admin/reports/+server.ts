import type { RequestHandler } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { getPendingReportsWithDetails, updateReportStatus } from '$lib/server/queries/reports';
import { z } from 'zod';

const updateReportStatusSchema = z.object({
	reportId: z.string().uuid(),
	status: z.enum(['dismissed', 'actioned'])
});

export const GET: RequestHandler = async (event) => {
	const authResult = requireAdmin(event);
	if (authResult instanceof Response) return authResult;

	const reports = await getPendingReportsWithDetails();
	return success({ reports });
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireAdmin(event);
	if (authResult instanceof Response) return authResult;
	const admin = authResult;

	const bodyResult = await parseRequestBody(event.request, updateReportStatusSchema);
	if (bodyResult instanceof Response) return bodyResult;

	const updated = await updateReportStatus(bodyResult.reportId, bodyResult.status, admin.id);
	if (!updated) {
		return error('Report not found', 'NOT_FOUND', 404);
	}
	return success({ report: updated });
};
