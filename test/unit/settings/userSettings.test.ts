import { describe, expect, it } from "@jest/globals";
import { DEFAULT_USER_SETTINGS } from "@/data/constants";
import {
  clampSnoozeMinutes,
  normalizeUserSettings,
  parseSnoozeMinutes,
} from "@/settings/userSettings";

describe("parseSnoozeMinutes", () => {
  it("accepts integers within 1-60", () => {
    expect(parseSnoozeMinutes("1")).toBe(1);
    expect(parseSnoozeMinutes("5")).toBe(5);
    expect(parseSnoozeMinutes("60")).toBe(60);
  });

  it("trims surrounding whitespace", () => {
    expect(parseSnoozeMinutes(" 7 ")).toBe(7);
  });

  it("rejects values outside the range", () => {
    expect(parseSnoozeMinutes("0")).toBeNull();
    expect(parseSnoozeMinutes("61")).toBeNull();
  });

  it("rejects non-integer or empty input", () => {
    expect(parseSnoozeMinutes("")).toBeNull();
    expect(parseSnoozeMinutes("abc")).toBeNull();
    expect(parseSnoozeMinutes("5.5")).toBeNull();
    expect(parseSnoozeMinutes("-3")).toBeNull();
    expect(parseSnoozeMinutes("1e1")).toBeNull();
  });
});

describe("clampSnoozeMinutes", () => {
  it("clamps to the allowed range", () => {
    expect(clampSnoozeMinutes(0)).toBe(1);
    expect(clampSnoozeMinutes(99)).toBe(60);
    expect(clampSnoozeMinutes(12)).toBe(12);
  });

  it("rounds fractional values and falls back for non-finite input", () => {
    expect(clampSnoozeMinutes(4.6)).toBe(5);
    expect(clampSnoozeMinutes(NaN)).toBe(DEFAULT_USER_SETTINGS.snoozeMinutes);
    expect(clampSnoozeMinutes(Infinity)).toBe(
      DEFAULT_USER_SETTINGS.snoozeMinutes,
    );
  });
});

describe("normalizeUserSettings", () => {
  it("returns defaults for empty or invalid payloads", () => {
    expect(normalizeUserSettings({})).toEqual(DEFAULT_USER_SETTINGS);
    expect(normalizeUserSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
    expect(normalizeUserSettings("junk")).toEqual(DEFAULT_USER_SETTINGS);
  });

  it("preserves valid values", () => {
    expect(
      normalizeUserSettings({
        autoDismissEnabled: false,
        snoozeMinutes: 15,
        showTileNumbers: true,
      }),
    ).toEqual({
      autoDismissEnabled: false,
      snoozeMinutes: 15,
      showTileNumbers: true,
    });
  });

  it("clamps out-of-range snooze minutes", () => {
    expect(normalizeUserSettings({ snoozeMinutes: 0 }).snoozeMinutes).toBe(1);
    expect(normalizeUserSettings({ snoozeMinutes: 99 }).snoozeMinutes).toBe(60);
  });

  it("ignores unknown keys", () => {
    expect(normalizeUserSettings({ unknown: true })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });

  it("coerces non-boolean flags and falls back when unparseable", () => {
    expect(
      normalizeUserSettings({ autoDismissEnabled: "false" }).autoDismissEnabled,
    ).toBe(false);
    expect(normalizeUserSettings({ showTileNumbers: 1 }).showTileNumbers).toBe(
      true,
    );
    expect(
      normalizeUserSettings({ autoDismissEnabled: "maybe" }).autoDismissEnabled,
    ).toBe(DEFAULT_USER_SETTINGS.autoDismissEnabled);
  });
});
