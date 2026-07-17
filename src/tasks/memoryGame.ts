export type TileState = "DEFAULT" | "SHOWING" | "CORRECT" | "INCORRECT";

export type Difficulty = "Easy" | "Normal" | "Hard";

export interface DifficultyConfig {
  gridSize: number;
  requiredTileClicks: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  Easy: { gridSize: 3, requiredTileClicks: 4 },
  Normal: { gridSize: 3, requiredTileClicks: 5 },
  Hard: { gridSize: 4, requiredTileClicks: 6 },
};

export const PROTOTYPE_DIFFICULTY: Difficulty = "Normal";
export const PROTOTYPE_ROUNDS = 3;

export function newGrid(size: number): TileState[] {
  return Array.from<TileState>({ length: size * size }).fill("DEFAULT");
}

export function generateOrder(config: DifficultyConfig): number[] {
  const indices = Array.from(
    { length: config.gridSize * config.gridSize },
    (_, i) => i,
  );
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, config.requiredTileClicks);
}

export interface TapResult {
  correct: boolean;
  nextPlayerIndex: number;
  roundComplete: boolean;
}

export function evaluateTap(
  order: number[],
  playerIndex: number,
  tappedIndex: number,
): TapResult {
  const correct = order[playerIndex] === tappedIndex;
  const nextPlayerIndex = playerIndex + 1;
  const roundComplete = nextPlayerIndex >= order.length;
  return { correct, nextPlayerIndex, roundComplete };
}
