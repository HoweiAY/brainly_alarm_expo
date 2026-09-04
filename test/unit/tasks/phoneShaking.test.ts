import { describe, expect, it } from "@jest/globals";
import { getShakeProgress } from "@/tasks/phoneShaking";

describe("phone shaking progress", () => {
  it("uses the generated shake total as full progress", () => {
    expect(getShakeProgress(15, 15)).toBe(1);
    expect(getShakeProgress(7, 15)).toBeCloseTo(7 / 15);
  });

  it("clamps progress to the valid range", () => {
    expect(getShakeProgress(31, 30)).toBe(1);
    expect(getShakeProgress(-1, 30)).toBe(0);
  });
});
