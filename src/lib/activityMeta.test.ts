import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPES,
  TYPE_GROUPS,
  TYPE_LABEL,
  categoryOf,
  eventLabel,
  badgeClass
} from './activityMeta';

describe('categoryOf', () => {
  it('maps known types to categories', () => {
    expect(categoryOf('login')).toBe('auth');
    expect(categoryOf('tile_complete')).toBe('play');
    expect(categoryOf('bingo_win')).toBe('wins');
    expect(categoryOf('admin_reset')).toBe('admin');
  });

  it('returns "other" for unknown types', () => {
    expect(categoryOf('something_else')).toBe('other');
  });
});

describe('eventLabel', () => {
  it('formats player events', () => {
    expect(eventLabel('tile_complete', 'Wear a hat')).toBe('Completed "Wear a hat"');
    expect(eventLabel('tile_uncomplete', 'Wear a hat')).toBe('Un-marked "Wear a hat"');
    expect(eventLabel('card_reshuffle', null)).toBe('Reshuffled card');
    expect(eventLabel('bingo_win', 'Row 3')).toBe('Bingo! (Row 3)');
    expect(eventLabel('bingo_win', null)).toBe('Bingo!');
  });

  it('formats admin events with the target in detail', () => {
    expect(eventLabel('admin_verify', 'Alice')).toBe('Verified Alice');
    expect(eventLabel('admin_reset', 'Alice')).toBe("Reset Alice's board");
  });

  it('falls back to the raw type for unknown types', () => {
    expect(eventLabel('mystery', null)).toBe('mystery');
  });
});

describe('completeness', () => {
  it('every type has a category, label, and badge class', () => {
    for (const t of ACTIVITY_TYPES) {
      expect(categoryOf(t)).not.toBe('other');
      expect(TYPE_LABEL[t]).toBeTruthy();
      expect(badgeClass(t)).toMatch(/border/);
    }
  });

  it('TYPE_GROUPS covers exactly the full type set', () => {
    const grouped = TYPE_GROUPS.flatMap((g) => g.types).sort();
    expect(grouped).toEqual([...ACTIVITY_TYPES].sort());
  });
});
