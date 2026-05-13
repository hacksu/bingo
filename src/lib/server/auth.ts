import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : [],
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID ?? '',
      clientSecret: env.DISCORD_CLIENT_SECRET ?? ''
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? ''
    }
  },
  // Disable email/password — only OAuth is offered.
  emailAndPassword: { enabled: false }
});
