export const GRID_SIZE = 5;

export function effectivePoolSize(tiles: { isFreeSpace: boolean }[]): number {
  const extraFreeSpaces = Math.max(0, tiles.filter((t) => t.isFreeSpace).length - 1);
  return tiles.length - extraFreeSpaces;
}

export function getCardSize(tileCount: number): number {
  let size = 5;
  while ((size + 2) ** 2 <= tileCount) size += 2;
  return size;
}

export function getWinLines(gridSize: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < gridSize; r++) {
    lines.push(Array.from({ length: gridSize }, (_, c) => r * gridSize + c));
  }
  for (let c = 0; c < gridSize; c++) {
    lines.push(Array.from({ length: gridSize }, (_, r) => r * gridSize + c));
  }
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + i));
  lines.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + (gridSize - 1 - i)));
  return lines;
}

export const WIN_LINES = getWinLines(GRID_SIZE);

export function detectBingo(
  completedPositions: Set<number>,
  gridSize: number = GRID_SIZE
): {
  hasBingo: boolean;
  winningLines: number[][];
  winningPositions: Set<number>;
} {
  const winLines = getWinLines(gridSize);
  const winningLines = winLines.filter((line) => line.every((p) => completedPositions.has(p)));
  const winningPositions = new Set<number>(winningLines.flat());
  return { hasBingo: winningLines.length > 0, winningLines, winningPositions };
}

export function describeWinLine(line: number[], gridSize: number = GRID_SIZE): string {
  const rows = line.map((p) => Math.floor(p / gridSize));
  const cols = line.map((p) => p % gridSize);
  if (rows.every((r) => r === rows[0])) return `Row ${rows[0] + 1}`;
  if (cols.every((c) => c === cols[0])) return `Column ${cols[0] + 1}`;
  if (line.every((p, i) => p === i * gridSize + i)) return 'Diagonal ↘';
  return 'Diagonal ↗';
}

/**
 * Detects the moment a player crosses into a bingo. Returns justWon=true only on
 * the false -> true transition, so marking further tiles while already winning
 * does not re-fire. lineLabel describes the first newly-completed line.
 */
export function bingoWinTransition(
  before: Set<number>,
  after: Set<number>,
  gridSize: number = GRID_SIZE
): { justWon: boolean; lineLabel: string | null } {
  const beforeRes = detectBingo(before, gridSize);
  const afterRes = detectBingo(after, gridSize);
  if (!afterRes.hasBingo || beforeRes.hasBingo) {
    return { justWon: false, lineLabel: null };
  }
  const beforeKeys = new Set(beforeRes.winningLines.map((l) => l.join(',')));
  const newLine = afterRes.winningLines.find((l) => !beforeKeys.has(l.join(',')));
  return { justWon: true, lineLabel: newLine ? describeWinLine(newLine, gridSize) : null };
}
