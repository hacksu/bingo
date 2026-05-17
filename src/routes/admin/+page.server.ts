import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bingoProgress, bingoTile, user } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [{ count: tileCount = 0 } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bingoTile)
    .where(sql`${bingoTile.isActive} = true`);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      completed: sql<number>`count(${bingoProgress.id})::int`
    })
    .from(user)
    .leftJoin(bingoProgress, sql`${bingoProgress.userId} = ${user.id}`)
    .groupBy(user.id)
    .orderBy(sql`count(${bingoProgress.id}) desc`, user.name);

  return { users: rows, tileCount };
};
