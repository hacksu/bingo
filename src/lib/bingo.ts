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
