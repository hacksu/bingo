import { describe, expect, it } from 'vitest';
import { toCsv, toJson, type ExportRow } from './activityExport';

const rows: ExportRow[] = [
  { createdAt: '2026-06-01T12:00:00.000Z', userName: 'Alice', type: 'bingo_win', detail: 'Row 3' },
  { createdAt: '2026-06-01T12:01:00.000Z', userName: 'Bob, Jr', type: 'tile_complete', detail: 'Say "hi"' },
  { createdAt: '2026-06-01T12:02:00.000Z', userName: 'Cleo', type: 'login', detail: null }
];

describe('toCsv', () => {
  it('writes a header and one row per event', () => {
    const lines = toCsv(rows).split('\n');
    expect(lines[0]).toBe('created_at,user_name,type,detail');
    expect(lines).toHaveLength(4);
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = toCsv(rows);
    expect(csv).toContain('"Bob, Jr"');
    expect(csv).toContain('"Say ""hi"""');
  });

  it('renders null detail as an empty cell', () => {
    const last = toCsv(rows).split('\n')[3];
    expect(last.endsWith(',')).toBe(true);
  });
});

describe('toJson', () => {
  it('emits an array of normalized rows', () => {
    const parsed = JSON.parse(toJson(rows));
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      createdAt: '2026-06-01T12:00:00.000Z',
      userName: 'Alice',
      type: 'bingo_win',
      detail: 'Row 3'
    });
    expect(parsed[2].detail).toBeNull();
  });
});
