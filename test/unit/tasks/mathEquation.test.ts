import { describe, expect, it } from "@jest/globals";
import { evaluateExpression } from "@/tasks/mathEquation";

describe("math equation evaluation", () => {
  it("evaluates allowed expressions with multiplication precedence", () => {
    expect(evaluateExpression("12 + 7 - 3")).toBe(16);
    expect(evaluateExpression("2 + 3 * 4 - 5")).toBe(9);
    expect(evaluateExpression("3 - 9")).toBe(-6);
  });

  it("rejects malformed and non-arithmetic expressions", () => {
    expect(evaluateExpression("2 +")).toBe(0);
    expect(evaluateExpression("2 ** 3")).toBe(0);
    expect(evaluateExpression("constructor.constructor('return 1')()")).toBe(0);
    expect(evaluateExpression("1".repeat(129))).toBe(0);
  });
});
