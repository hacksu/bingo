import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// At `vite build` time, SvelteKit imports server modules to scan routes.
// `$env/dynamic/private` is runtime-only by design, so DATABASE_URL is
// undefined during that phase — we tolerate it then and only error at runtime.
const url = env.DATABASE_URL;
if (!building && !url) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(url ?? 'postgres://placeholder@localhost/placeholder', { max: 10 });

export const db = drizzle(client, { schema });
export { schema };
