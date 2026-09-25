import { describe, expect, it } from "@jest/globals";
import {
  RANDOM_TASK_POOL,
  isRandomTaskCandidate,
  pickRandomTask,
  resolveAlarmTask,
} from "@/tasks/randomTask";

describe("random task pool", () => {
  it("contains every dismissal task except None", () => {
    expect(RANDOM_TASK_POOL).toEqual(["Memory", "Math", "Shake phone"]);
    expect(isRandomTaskCandidate("None")).toBe(false);
    expect(isRandomTaskCandidate("Random")).toBe(false);
    expect(isRandomTaskCandidate(undefined)).toBe(false);
    expect(isRandomTaskCandidate("Math")).toBe(true);
  });
});

describe("pickRandomTask", () => {
  it("maps the random value uniformly onto the pool", () => {
    expect(pickRandomTask(() => 0)).toBe("Memory");
    expect(pickRandomTask(() => 0.5)).toBe("Math");
    expect(pickRandomTask(() => 0.99)).toBe("Shake phone");
  });

  it("clamps out-of-range random values", () => {
    expect(pickRandomTask(() => 1)).toBe("Shake phone");
  });

  it("never picks None", () => {
    for (let i = 0; i < 100; i++) {
      expect(pickRandomTask()).not.toBe("None");
    }
  });
});

describe("resolveAlarmTask", () => {
  it("passes concrete tasks through unchanged", () => {
    expect(resolveAlarmTask("None", "Math", () => 0)).toBe("None");
    expect(resolveAlarmTask("Memory", undefined, () => 0.99)).toBe("Memory");
  });

  it("keeps an eligible previous draw for Random", () => {
    expect(resolveAlarmTask("Random", "Shake phone", () => 0)).toBe(
      "Shake phone",
    );
  });

  it("draws when Random has no eligible previous draw", () => {
    expect(resolveAlarmTask("Random", undefined, () => 0.5)).toBe("Math");
    expect(resolveAlarmTask("Random", "None", () => 0)).toBe("Memory");
  });
});
