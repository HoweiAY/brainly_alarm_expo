import { describe, expect, it, jest } from "@jest/globals";
import {
  buildSoundSelection,
  DEFAULT_SOUND_LABEL,
  defaultSoundSelection,
  isDefaultSound,
  sanitizeAudioFileName,
  soundLabelFor,
} from "@/alarms/audioSelection";

jest.mock("expo-file-system", () => ({
  File: class {
    exists = false;
    delete() {}
  },
}));

jest.mock("@/store/alarmStore", () => ({
  useAlarmStore: { getState: () => ({ alarms: [] }) },
}));

describe("isDefaultSound", () => {
  it("returns true for null", () => {
    expect(isDefaultSound(null)).toBe(true);
  });

  it("returns true for an empty string", () => {
    expect(isDefaultSound("")).toBe(true);
  });

  it("returns false for a custom file URI", () => {
    expect(isDefaultSound("file:///data/alarm.mp3")).toBe(false);
  });
});

describe("defaultSoundSelection", () => {
  it("returns the default label and a null URI", () => {
    expect(defaultSoundSelection()).toEqual({
      alarmSoundSelected: DEFAULT_SOUND_LABEL,
      alarmSoundUri: null,
    });
  });
});

describe("soundLabelFor", () => {
  it("returns Default for null", () => {
    expect(soundLabelFor(null)).toBe(DEFAULT_SOUND_LABEL);
  });

  it("returns Default for an empty string", () => {
    expect(soundLabelFor("")).toBe(DEFAULT_SOUND_LABEL);
  });

  it("extracts the basename from a file URI", () => {
    expect(soundLabelFor("file:///data/alarm_sounds/morning_alarm.mp3")).toBe(
      "morning_alarm.mp3",
    );
  });

  it("hides the unique prefix from a stored file URI", () => {
    expect(
      soundLabelFor(
        "file:///data/alarm_sounds/17600000000000_morning_alarm.mp3",
      ),
    ).toBe("morning_alarm.mp3");
  });

  it("returns the value as-is when it has no path separator", () => {
    expect(soundLabelFor("morning_alarm.mp3")).toBe("morning_alarm.mp3");
  });
});

describe("sanitizeAudioFileName", () => {
  it("preserves the file extension", () => {
    expect(sanitizeAudioFileName("morning_alarm.mp3")).toMatch(/\.mp3$/);
  });

  it("removes path separators and dot-dot sequences", () => {
    const result = sanitizeAudioFileName("../../etc/passwd\\evil.mp3");
    expect(result).not.toMatch(/[/\\]|\.\./);
    expect(result).toMatch(/\.mp3$/);
  });

  it("produces unique names across calls", () => {
    const first = sanitizeAudioFileName("song.mp3");
    const second = sanitizeAudioFileName("song.mp3");
    expect(first).not.toBe(second);
  });

  it("falls back to alarm_sound for missing or empty input", () => {
    expect(sanitizeAudioFileName(undefined)).toMatch(/alarm_sound/);
    expect(sanitizeAudioFileName("")).toMatch(/alarm_sound/);
  });

  it("keeps the original extension when only an extension is provided", () => {
    expect(sanitizeAudioFileName(".mp3")).toMatch(/alarm_sound\.mp3$/);
  });
});

describe("buildSoundSelection", () => {
  it("uses the provided name as the label", () => {
    expect(
      buildSoundSelection("my song.mp3", "file:///x/my%20song.mp3"),
    ).toEqual({
      alarmSoundSelected: "my song.mp3",
      alarmSoundUri: "file:///x/my%20song.mp3",
    });
  });

  it("falls back to the URI basename when the name is missing", () => {
    expect(
      buildSoundSelection(undefined, "file:///x/morning_alarm.mp3"),
    ).toEqual({
      alarmSoundSelected: "morning_alarm.mp3",
      alarmSoundUri: "file:///x/morning_alarm.mp3",
    });
  });
});
