import { describe, expect, it, jest } from "@jest/globals";
import { toggleAlarmEnabled } from "@/alarms/toggleAlarmEnabled";
import type { Alarm } from "@/data/types";

function makeAlarm(enabled: boolean): Alarm {
  return {
    id: "a",
    days: ["Mon"],
    hour: 8,
    minute: 0,
    task: "Memory",
    rounds: 1,
    difficulty: "Easy",
    sound: null,
    snooze: true,
    enabled,
  };
}

describe("toggleAlarmEnabled", () => {
  it("returns true and schedules when enabling succeeds", async () => {
    const alarm = makeAlarm(false);
    const updateAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockResolvedValue(undefined);
    const setAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockResolvedValue(undefined);
    const cancelAlarm = jest
      .fn<(alarm: { id: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    const result = await toggleAlarmEnabled(alarm, {
      updateAlarm,
      setAlarm,
      cancelAlarm,
    });

    expect(result).toBe(true);
    expect(updateAlarm).toHaveBeenCalledWith({ ...alarm, enabled: true });
    expect(setAlarm).toHaveBeenCalledWith({ ...alarm, enabled: true });
    expect(cancelAlarm).not.toHaveBeenCalled();
  });

  it("restores store and scheduler when setAlarm rejects", async () => {
    const alarm = makeAlarm(false);
    const next = { ...alarm, enabled: true };
    const updateAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockResolvedValue(undefined);
    const setAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockRejectedValueOnce(new Error("schedule failed"))
      .mockResolvedValueOnce(undefined);
    const cancelAlarm = jest
      .fn<(alarm: { id: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    const result = await toggleAlarmEnabled(alarm, {
      updateAlarm,
      setAlarm,
      cancelAlarm,
    });

    expect(result).toBe(false);
    expect(updateAlarm).toHaveBeenNthCalledWith(1, next);
    expect(updateAlarm).toHaveBeenNthCalledWith(2, alarm);
    expect(setAlarm).toHaveBeenCalledTimes(2);
    expect(setAlarm).toHaveBeenNthCalledWith(2, alarm);
    expect(cancelAlarm).not.toHaveBeenCalled();
  });

  it("still restores the scheduler when the rollback update rejects", async () => {
    const alarm = makeAlarm(false);
    const next = { ...alarm, enabled: true };
    const updateAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("rollback db failed"));
    const setAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockRejectedValueOnce(new Error("schedule failed"))
      .mockResolvedValueOnce(undefined);
    const cancelAlarm = jest
      .fn<(alarm: { id: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    const result = await toggleAlarmEnabled(alarm, {
      updateAlarm,
      setAlarm,
      cancelAlarm,
    });

    expect(result).toBe(false);
    expect(updateAlarm).toHaveBeenNthCalledWith(1, next);
    expect(updateAlarm).toHaveBeenNthCalledWith(2, alarm);
    expect(setAlarm).toHaveBeenCalledTimes(2);
    expect(setAlarm).toHaveBeenNthCalledWith(2, alarm);
    expect(cancelAlarm).not.toHaveBeenCalled();
  });

  it("does not restore when the store update itself rejects", async () => {
    const alarm = makeAlarm(false);
    const updateAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockRejectedValue(new Error("db failed"));
    const setAlarm = jest
      .fn<(alarm: Alarm) => Promise<void>>()
      .mockResolvedValue(undefined);
    const cancelAlarm = jest
      .fn<(alarm: { id: string }) => Promise<void>>()
      .mockResolvedValue(undefined);

    const result = await toggleAlarmEnabled(alarm, {
      updateAlarm,
      setAlarm,
      cancelAlarm,
    });

    expect(result).toBe(false);
    expect(updateAlarm).toHaveBeenCalledTimes(1);
    expect(setAlarm).not.toHaveBeenCalled();
    expect(cancelAlarm).not.toHaveBeenCalled();
  });
});
