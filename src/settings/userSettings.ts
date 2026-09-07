import {
  DEFAULT_USER_SETTINGS,
  SNOOZE_MINUTES_MAX,
  SNOOZE_MINUTES_MIN,
} from "@/data/constants";
import type { UserSettings } from "@/data/types";

export function parseSnoozeMinutes(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (value < SNOOZE_MINUTES_MIN || value > SNOOZE_MINUTES_MAX) return null;
  return value;
}

export function clampSnoozeMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_USER_SETTINGS.snoozeMinutes;
  return Math.min(
    SNOOZE_MINUTES_MAX,
    Math.max(SNOOZE_MINUTES_MIN, Math.round(value)),
  );
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return fallback;
}

export function normalizeUserSettings(raw: unknown): UserSettings {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const snoozeRaw = source.snoozeMinutes;
  const snoozeNumber =
    typeof snoozeRaw === "number"
      ? snoozeRaw
      : typeof snoozeRaw === "string"
        ? Number(snoozeRaw)
        : NaN;
  return {
    autoDismissEnabled: toBoolean(
      source.autoDismissEnabled,
      DEFAULT_USER_SETTINGS.autoDismissEnabled,
    ),
    snoozeMinutes: clampSnoozeMinutes(snoozeNumber),
    showTileNumbers: toBoolean(
      source.showTileNumbers,
      DEFAULT_USER_SETTINGS.showTileNumbers,
    ),
  };
}
