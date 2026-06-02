import { ACTIVITY_TYPES, DEFAULT_LIMIT, LIMIT_STEP, MAX_LIMIT } from '$lib/activityMeta';

export type ActivityFilters = {
  type: string | null;
  userId: string | null;
  limit: number;
};

export { DEFAULT_LIMIT, LIMIT_STEP, MAX_LIMIT };

export function buildActivityFilters(params: URLSearchParams): ActivityFilters {
  const typeRaw = params.get('type');
  const type = typeRaw && (ACTIVITY_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : null;

  const userRaw = params.get('user');
  const userId = userRaw && userRaw.length > 0 ? userRaw : null;

  const limitRaw = Number(params.get('limit'));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;

  return { type, userId, limit };
}

export type PurgeRequest = { mode: 'all' } | { mode: 'older'; before: Date };

export function parsePurgeRequest(
  mode: string | null,
  before: string | null
): PurgeRequest | null {
  if (mode === 'all') return { mode: 'all' };
  if (mode === 'older') {
    if (!before) return null;
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) return null;
    return { mode: 'older', before: d };
  }
  return null;
}
