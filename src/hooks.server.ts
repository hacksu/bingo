import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';

const populateLocals: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;
  return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
  return svelteKitHandler({
    event,
    resolve: (e) => populateLocals({ event: e, resolve }),
    auth
  });
};
