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
  if (expression.length > 128 || !/^[\d+\-*\s]+$/.test(expression)) return 0;

  const tokens = expression.match(/\d+|[+*-]/g);
  if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) return 0;
  if (tokens.length % 2 === 0) return 0;

  const first = Number(tokens[0]);
  if (!Number.isFinite(first)) return 0;

  let result = 0;
  let term = first;
  let sign = 1;

  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index];
    const operand = Number(tokens[index + 1]);
    if (!Number.isFinite(operand)) return 0;

    if (operator === "*") {
      term *= operand;
      continue;
    }

    result += sign * term;
    term = operand;
    sign = operator === "+" ? 1 : -1;
  }

  const value = result + sign * term;
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

export function parseAnswer(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}
