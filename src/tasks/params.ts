import type { Difficulty } from "@/data/types";
import { taskDifficulties } from "@/data/constants";

export function parseTaskParams(
  roundsParam?: string,
  difficultyParam?: string,
): { rounds: number; difficulty: Difficulty } {
  const rounds = Math.max(1, Math.floor(Number(roundsParam) || 3));
  const difficulty = (taskDifficulties as string[]).includes(
    difficultyParam ?? "",
  )
    ? (difficultyParam as Difficulty)
    : "Normal";
  return { rounds, difficulty };
}
