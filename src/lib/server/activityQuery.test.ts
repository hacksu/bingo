import { describe, expect, it } from 'vitest';
import { buildActivityFilters, parsePurgeRequest, DEFAULT_LIMIT, MAX_LIMIT } from './activityQuery';

const params = (q: string) => new URLSearchParams(q);

describe('buildActivityFilters', () => {
  it('defaults to no filters and the default limit', () => {
    expect(buildActivityFilters(params(''))).toEqual({
      type: null,
      userId: null,
      limit: DEFAULT_LIMIT
    });
  });

  it('accepts a known type and a user id', () => {
    expect(buildActivityFilters(params('type=bingo_win&user=abc123'))).toEqual({
      type: 'bingo_win',
      userId: 'abc123',
      limit: DEFAULT_LIMIT
    });
  });

  it('rejects an unknown type', () => {
    expect(buildActivityFilters(params('type=not_a_type')).type).toBeNull();
  });

  it('clamps the limit to MAX_LIMIT and ignores junk', () => {
    expect(buildActivityFilters(params('limit=999999')).limit).toBe(MAX_LIMIT);
    expect(buildActivityFilters(params('limit=abc')).limit).toBe(DEFAULT_LIMIT);
    expect(buildActivityFilters(params('limit=-5')).limit).toBe(DEFAULT_LIMIT);
    expect(buildActivityFilters(params('limit=400')).limit).toBe(400);
  });
});

describe('parsePurgeRequest', () => {
  it('parses purge-all', () => {
    expect(parsePurgeRequest('all', null)).toEqual({ mode: 'all' });
  });

  it('parses purge-older with a valid date', () => {
    const result = parsePurgeRequest('older', '2026-01-01');
    expect(result).not.toBeNull();
    expect(result && result.mode).toBe('older');
    expect(result && 'before' in result && result.before instanceof Date).toBe(true);
  });

  it('rejects older without a date or with an invalid date', () => {
    expect(parsePurgeRequest('older', null)).toBeNull();
    expect(parsePurgeRequest('older', 'not-a-date')).toBeNull();
  });

  it('rejects unknown modes', () => {
    expect(parsePurgeRequest('nuke', null)).toBeNull();
    expect(parsePurgeRequest(null, null)).toBeNull();
  });
});
