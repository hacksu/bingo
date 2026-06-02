import { describe, expect, it } from 'vitest';
import { describeWinLine, bingoWinTransition } from './bingo';

describe('describeWinLine', () => {
  it('names rows, columns, and diagonals', () => {
    expect(describeWinLine([0, 1, 2, 3, 4])).toBe('Row 1');
    expect(describeWinLine([10, 11, 12, 13, 14])).toBe('Row 3');
    expect(describeWinLine([2, 7, 12, 17, 22])).toBe('Column 3');
    expect(describeWinLine([0, 6, 12, 18, 24])).toBe('Diagonal ↘');
    expect(describeWinLine([4, 8, 12, 16, 20])).toBe('Diagonal ↗');
  });
});

describe('bingoWinTransition', () => {
  const row1 = new Set([0, 1, 2, 3]); // row 1 missing position 4

  it('fires once when a line is completed', () => {
    const before = row1;
    const after = new Set([0, 1, 2, 3, 4]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: true, lineLabel: 'Row 1' });
  });

  it('does not fire when already in bingo and another tile is marked', () => {
    const before = new Set([0, 1, 2, 3, 4]); // already row 1
    const after = new Set([0, 1, 2, 3, 4, 7]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: false, lineLabel: null });
  });

  it('does not fire when no line is complete', () => {
    const before = new Set([0, 1]);
    const after = new Set([0, 1, 2]);
    expect(bingoWinTransition(before, after)).toEqual({ justWon: false, lineLabel: null });
  });

  it('fires again after losing and regaining a bingo', () => {
    const before = new Set([0, 1, 2, 3]);
    const after = new Set([0, 1, 2, 3, 4]);
    expect(bingoWinTransition(before, after).justWon).toBe(true);
  });
});
