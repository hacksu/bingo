import { error, redirect, type Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { refreshDiscordRole } from '$lib/server/admin';

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  if (event.url.pathname.startsWith('/admin')) {
    if (!event.locals.user) throw redirect(302, '/login');
    const role = await refreshDiscordRole(event.locals.user.id);
    if (role !== 'admin') {
      throw error(
        403,
        "Admin access required. If you should have access, sign out and back in via Discord (your token may predate the guilds.members.read scope), or set your role to 'admin' directly in the DB."
      );
    }
  }

  return resolve(event);
};
