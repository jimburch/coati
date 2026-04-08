import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getUserById, updateUserProfile } from '$lib/server/queries/users';
import { updateProfileSchema } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	const profileUser = await getUserById(locals.user!.id);
	return { profileUser };
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = {
			name: formData.get('name') as string,
			bio: formData.get('bio') as string,
			websiteUrl: formData.get('websiteUrl') as string,
			location: formData.get('location') as string
		};

		const parsed = updateProfileSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0].message,
				fields: raw
			});
		}

		await updateUserProfile(locals.user!.id, parsed.data);
		return { success: true };
	}
};
