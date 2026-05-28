import { error, redirect, type Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  if (event.url.pathname.startsWith('/admin')) {
    if (!event.locals.user) throw redirect(302, '/login');
    if (event.locals.user.role !== 'admin') {
      throw error(
        403,
        "Admin access required. If you should have access, sign out and back in via Discord (your token may predate the guilds.members.read scope), or set your role to 'admin' directly in the DB."
      );
    }
  }

  return resolve(event);
};
