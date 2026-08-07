import { taskDifficulties } from "@/data/constants";
import type { Difficulty } from "@/data/types";

export function parseTaskParams(
  roundsParam?: string,
  difficultyParam?: string,
): { rounds: number; difficulty: Difficulty } {
  const parsed = Number(roundsParam);
  const rounds = Math.max(
    1,
    Math.floor(Number.isFinite(parsed) && parsed ? parsed : 3),
  );
  const difficulty = (taskDifficulties as string[]).includes(
    difficultyParam ?? "",
  )
    ? (difficultyParam as Difficulty)
    : "Normal";
  return { rounds, difficulty };
}
