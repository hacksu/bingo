// src/routes/admin/+page.server.ts
import { loadStandings } from '$lib/server/standings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
  depends('app:admin');
  const { standings, tileCount, lockedCount } = await loadStandings();

  const rows = standings.map((u) => {
    const verified = u.verifiedAt !== null;
    return {
      id: u.id,
      name: u.name,
      image: u.image,
      role: u.role,
      completed: u.completed,
      hasBingo: u.hasBingo,
      verified,
      verifiedAt: u.verifiedAt,
      sortRank: u.hasBingo && !verified ? 2 : u.hasBingo && verified ? 1 : 0
    };
  });

  rows.sort(
    (a, b) => b.sortRank - a.sortRank || b.completed - a.completed || a.name.localeCompare(b.name)
  );

  return {
    users: rows,
    tileCount,
    lockedCount,
    pendingCount: rows.filter((r) => r.hasBingo && !r.verified).length,
    verifiedCount: rows.filter((r) => r.verified).length
  };
};
