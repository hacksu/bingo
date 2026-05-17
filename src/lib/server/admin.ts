import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { account, user } from './db/schema';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Refreshes a user's admin status by checking Discord guild membership.
 *
 * Only changes the DB role on a *conclusive* Discord answer:
 *   - 200 + role present  → admin
 *   - 200 + role absent   → user
 *   - 404 (not in guild)  → user
 * Any other case (no env vars, no linked Discord account, missing access
 * token, 401/403 from a stale/insufficient token, network error, etc.) leaves
 * the existing DB role alone — so a manually-set admin doesn't get downgraded
 * because the OAuth token hasn't been re-issued with `guilds.members.read`.
 */
export async function refreshDiscordRole(userId: string): Promise<'admin' | 'user'> {
  const guildId = env.DISCORD_GUILD_ID;
  const adminRoleId = env.DISCORD_ADMIN_ROLE_ID;

  const [current] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!current) return 'user';
  const currentRole: 'admin' | 'user' = current.role === 'admin' ? 'admin' : 'user';

  if (!guildId || !adminRoleId) return currentRole;

  const [discordAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
    .limit(1);

  if (!discordAccount?.accessToken) return currentRole;

  let res: Response;
  try {
    res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${discordAccount.accessToken}` }
    });
  } catch {
    return currentRole;
  }

  // Stale token or missing scope — don't silently downgrade.
  if (res.status === 401 || res.status === 403) return currentRole;

  let nextRole: 'admin' | 'user';
  if (res.status === 404) {
    nextRole = 'user';
  } else if (res.ok) {
    const member = (await res.json().catch(() => null)) as { roles?: string[] } | null;
    nextRole = member?.roles?.includes(adminRoleId) ? 'admin' : 'user';
  } else {
    return currentRole;
  }

  if (currentRole !== nextRole) {
    await db.update(user).set({ role: nextRole, updatedAt: new Date() }).where(eq(user.id, userId));
  }
  return nextRole;
}

export function isAdmin(u: { role?: string | null } | null | undefined): boolean {
  return u?.role === 'admin';
}
