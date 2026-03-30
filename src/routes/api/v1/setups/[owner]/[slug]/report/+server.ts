import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, isUniqueViolation, parseRequestBody } from '$lib/server/responses';
import { createReport } from '$lib/server/queries/reports';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { createReportSchema } from '$lib/types';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const bodyResult = await parseRequestBody(event.request, createReportSchema);
	if (bodyResult instanceof Response) return bodyResult;

	try {
		const report = await createReport(setup.id, user.id, bodyResult.reason, bodyResult.description);
		return success({ id: report.id, reason: report.reason, status: report.status }, 201);
	} catch (err) {
		if (isUniqueViolation(err)) {
			return error('You have already reported this setup', 'DUPLICATE_REPORT', 409);
		}
		throw err;
	}
};
