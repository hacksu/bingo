// src/routes/leaderboard/+page.server.ts
import { loadStandings } from '$lib/server/standings';
import { GRID_SIZE } from '$lib/bingo';
import type { PageServerLoad } from './$types';

const MARKABLE = GRID_SIZE * GRID_SIZE - 1; // 24 markable cells (free space excluded)

export const load: PageServerLoad = async ({ depends }) => {
  depends('app:standings');
  const { standings } = await loadStandings();

  const visible = standings.filter((s) => s.completed > 0 || s.verifiedAt !== null);

  const verified = visible
    .filter((s) => s.verifiedAt !== null)
    .sort((a, b) => a.verifiedAt!.getTime() - b.verifiedAt!.getTime());

  const rest = visible
    .filter((s) => s.verifiedAt === null)
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));

  const players = [...verified, ...rest].map((s, i) => ({
    rank: i + 1,
    name: s.name,
    image: s.image,
    completed: Math.min(s.completed, MARKABLE),
    verifiedAt: s.verifiedAt
  }));

  return { players, markable: MARKABLE };
};
