import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getPendingReportsWithDetails, updateReportStatus } from '$lib/server/queries/reports';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login/github');
	}
	if (!locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const reports = await getPendingReportsWithDetails();
	return { reports };
};

export const actions: Actions = {
	dismiss: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login/github');
		}
		if (!locals.user.isAdmin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await request.formData();
		const reportId = formData.get('reportId');
		if (typeof reportId !== 'string' || !reportId) {
			return fail(400, { error: 'Missing reportId' });
		}

		await updateReportStatus(reportId, 'dismissed', locals.user.id);
		return { success: true };
	},

	action: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login/github');
		}
		if (!locals.user.isAdmin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await request.formData();
		const reportId = formData.get('reportId');
		if (typeof reportId !== 'string' || !reportId) {
			return fail(400, { error: 'Missing reportId' });
		}

		await updateReportStatus(reportId, 'actioned', locals.user.id);
		return { success: true };
	}
};
