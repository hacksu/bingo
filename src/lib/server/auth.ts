import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { logActivity } from './activity';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await logActivity({ userId: session.userId, type: 'login' });
        }
      },
      delete: {
        after: async (session) => {
          await logActivity({ userId: session.userId, type: 'logout' });
        }
      }
    }
  },
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : [],
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false }
    }
  },
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID ?? '',
      clientSecret: env.DISCORD_CLIENT_SECRET ?? '',
      scope: ['identify', 'email', 'guilds.members.read']
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID ?? '',
      clientSecret: env.GITHUB_CLIENT_SECRET ?? ''
    }
  },
  // Disable email/password — only OAuth is offered.
  emailAndPassword: { enabled: false }
});
