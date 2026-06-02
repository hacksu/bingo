export const MAX_GRID_SIZE = 6;
export const GRID_SIZE = 5;

if (GRID_SIZE > MAX_GRID_SIZE) {
  throw new Error(
    `GRID_SIZE (${GRID_SIZE}) exceeds MAX_GRID_SIZE (${MAX_GRID_SIZE}). Cards are capped at 6x6.`
  );
}

// All 12 winning lines on a 5x5 board, expressed as tile positions (0..24).
export const WIN_LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, c) => r * GRID_SIZE + c));
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, r) => r * GRID_SIZE + c));
  }
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + i));
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => i * GRID_SIZE + (GRID_SIZE - 1 - i)));
  return lines;
})();

export function detectBingo(completedPositions: Set<number>): {
  hasBingo: boolean;
  winningLines: number[][];
  winningPositions: Set<number>;
} {
  const winningLines = WIN_LINES.filter((line) => line.every((p) => completedPositions.has(p)));
  const winningPositions = new Set<number>(winningLines.flat());
  return { hasBingo: winningLines.length > 0, winningLines, winningPositions };
}

export function describeWinLine(line: number[]): string {
  const rows = line.map((p) => Math.floor(p / GRID_SIZE));
  const cols = line.map((p) => p % GRID_SIZE);
  if (rows.every((r) => r === rows[0])) return `Row ${rows[0] + 1}`;
  if (cols.every((c) => c === cols[0])) return `Column ${cols[0] + 1}`;
  if (line.every((p, i) => p === i * GRID_SIZE + i)) return 'Diagonal ↘';
  return 'Diagonal ↗';
}

/**
 * Detects the moment a player crosses into a bingo. Returns justWon=true only on
 * the false -> true transition, so marking further tiles while already winning
 * does not re-fire. lineLabel describes the first newly-completed line.
 */
export function bingoWinTransition(
  before: Set<number>,
  after: Set<number>
): { justWon: boolean; lineLabel: string | null } {
  const beforeRes = detectBingo(before);
  const afterRes = detectBingo(after);
  if (!afterRes.hasBingo || beforeRes.hasBingo) {
    return { justWon: false, lineLabel: null };
  }
  const beforeKeys = new Set(beforeRes.winningLines.map((l) => l.join(',')));
  const newLine = afterRes.winningLines.find((l) => !beforeKeys.has(l.join(',')));
  return { justWon: true, lineLabel: newLine ? describeWinLine(newLine) : null };
}
