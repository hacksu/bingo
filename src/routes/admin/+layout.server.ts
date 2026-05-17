import { error, redirect } from '@sveltejs/kit';
import { refreshDiscordRole } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const role = await refreshDiscordRole(locals.user.id);
  if (role !== 'admin') {
    throw error(
      403,
      "Admin access required. If you should have access, sign out and back in via Discord (your token may predate the guilds.members.read scope), or set your role to 'admin' directly in the DB."
    );
  }

  return { role };
};
