import { Parser } from "expr-eval";

export type Difficulty = "Easy" | "Normal" | "Hard";

export interface MathDifficultyConfig {
  operandCount: number;
  minOperand: number;
  maxOperand: number;
  operators: readonly ("+" | "-" | "*")[];
}

export const MATH_DIFFICULTY_CONFIG: Record<Difficulty, MathDifficultyConfig> =
  {
    Easy: {
      operandCount: 2,
      minOperand: 1,
      maxOperand: 30,
      operators: ["+", "-"],
    },
    Normal: {
      operandCount: 3,
      minOperand: 1,
      maxOperand: 50,
      operators: ["+", "-"],
    },
    Hard: {
      operandCount: 3,
      minOperand: 1,
      maxOperand: 20,
      operators: ["+", "-", "*"],
    },
  };

export const PROTOTYPE_DIFFICULTY: Difficulty = "Normal";
export const PROTOTYPE_ROUNDS = 3;

const parser = new Parser();

export function generateEquation(difficulty: Difficulty): string {
  const config = MATH_DIFFICULTY_CONFIG[difficulty];
  const operands = Array.from(
    { length: config.operandCount },
    () =>
      config.minOperand +
      Math.floor(Math.random() * (config.maxOperand - config.minOperand + 1)),
  );
  const parts: string[] = [];
  operands.forEach((operand, index) => {
    parts.push(String(operand));
    if (index < operands.length - 1) {
      parts.push(
        config.operators[Math.floor(Math.random() * config.operators.length)],
      );
    }
  });
  return parts.join(" ");
}

export function evaluateExpression(expression: string): number {
  if (!/^[\d+\-*\s]+$/.test(expression)) return 0;
  try {
    const result: unknown = parser.parse(expression).evaluate();
    if (typeof result !== "number" || !Number.isFinite(result)) return 0;
    return Math.trunc(result);
  } catch {
    return 0;
  }
}

export function parseAnswer(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}
