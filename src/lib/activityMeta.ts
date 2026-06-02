export type ActivityCategory = 'auth' | 'play' | 'wins' | 'admin';

export const ACTIVITY_TYPES = [
  'login',
  'logout',
  'tile_complete',
  'tile_uncomplete',
  'card_reshuffle',
  'bingo_win',
  'admin_verify',
  'admin_unverify',
  'admin_reset',
  'tile_create',
  'tile_update',
  'tile_delete',
  'tile_bulk_add'
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

const CATEGORY: Record<ActivityType, ActivityCategory> = {
  login: 'auth',
  logout: 'auth',
  tile_complete: 'play',
  tile_uncomplete: 'play',
  card_reshuffle: 'play',
  bingo_win: 'wins',
  admin_verify: 'admin',
  admin_unverify: 'admin',
  admin_reset: 'admin',
  tile_create: 'admin',
  tile_update: 'admin',
  tile_delete: 'admin',
  tile_bulk_add: 'admin'
};

export const TYPE_LABEL: Record<ActivityType, string> = {
  login: 'Login',
  logout: 'Logout',
  tile_complete: 'Tile completed',
  tile_uncomplete: 'Tile un-marked',
  card_reshuffle: 'Card reshuffle',
  bingo_win: 'Bingo win',
  admin_verify: 'Admin: verify',
  admin_unverify: 'Admin: un-verify',
  admin_reset: 'Admin: reset board',
  tile_create: 'Admin: create tile',
  tile_update: 'Admin: edit tile',
  tile_delete: 'Admin: delete tile',
  tile_bulk_add: 'Admin: bulk add tiles'
};

export const TYPE_GROUPS: { label: string; category: ActivityCategory; types: ActivityType[] }[] = [
  { label: 'Auth', category: 'auth', types: ['login', 'logout'] },
  { label: 'Play', category: 'play', types: ['tile_complete', 'tile_uncomplete', 'card_reshuffle'] },
  { label: 'Wins', category: 'wins', types: ['bingo_win'] },
  {
    label: 'Admin',
    category: 'admin',
    types: ['admin_verify', 'admin_unverify', 'admin_reset', 'tile_create', 'tile_update', 'tile_delete', 'tile_bulk_add']
  }
];

export function categoryOf(type: string): ActivityCategory | 'other' {
  return (CATEGORY as Record<string, ActivityCategory>)[type] ?? 'other';
}

export function eventLabel(type: string, detail: string | null): string {
  switch (type) {
    case 'login':
      return 'Signed in';
    case 'logout':
      return 'Signed out';
    case 'tile_complete':
      return `Completed "${detail ?? ''}"`;
    case 'tile_uncomplete':
      return `Un-marked "${detail ?? ''}"`;
    case 'card_reshuffle':
      return 'Reshuffled card';
    case 'bingo_win':
      return detail ? `Bingo! (${detail})` : 'Bingo!';
    case 'admin_verify':
      return `Verified ${detail ?? 'a player'}`;
    case 'admin_unverify':
      return `Un-verified ${detail ?? 'a player'}`;
    case 'admin_reset':
      return `Reset ${detail ?? 'a player'}'s board`;
    case 'tile_create':
      return `Created tile "${detail ?? ''}"`;
    case 'tile_update':
      return `Edited tile "${detail ?? ''}"`;
    case 'tile_delete':
      return `Deleted tile "${detail ?? ''}"`;
    case 'tile_bulk_add':
      return `Bulk-added ${detail ?? ''}`;
    default:
      return type;
  }
}

export function badgeClass(type: string): string {
  switch (categoryOf(type)) {
    case 'wins':
      return 'bg-amber-500/20 border border-amber-400/40 text-amber-200';
    case 'play':
      return 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200';
    case 'admin':
      return 'bg-sky-500/20 border border-sky-400/40 text-sky-200';
    case 'auth':
    default:
      return 'bg-white/5 border border-white/10 text-slate-300';
  }
}

export const DEFAULT_LIMIT = 200;
export const LIMIT_STEP = 200;
export const MAX_LIMIT = 5000;
